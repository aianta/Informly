const _INFORMLY_INFO_TEMPLATE_URL = browser.runtime.getURL('templates/informly_check_info.html')
const _INFORMLY_MISINFO_PROMPT_TEMPLATE_URL = browser.runtime.getURL('templates/misinfo_prompt.json')

//DEFINE TIMEOUTS
var _INFORMLY_CHATGPT_TIMEOUT
var _INFORMLY_HIDE_INFO_TIMEOUT

// Define an option map of default values to use in case of undefined.
// TODO: unduplicate this.
const optionMap = new Map()
optionMap.set('_openai_key', '')
optionMap.set('_openai_org', '')
optionMap.set('_openai_url','https://api.openai.com/v1/chat/completions')
optionMap.set('_dbpedia_spotlight_url', 'https://api.dbpedia-spotlight.org/en')
optionMap.set('_prompt_prefix', 'Does the following comment contain misinformation: ')
optionMap.set('_input_timeout', 5000)
optionMap.set('_fade_timeout', 2000)
optionMap.set('_thank_timeout', 2000)
optionMap.set('_min_snippet_length', 1)
optionMap.set('_min_sentences', 1) 
optionMap.set('_allow_negative_samples', true) //TODO: change to false
optionMap.set('_allow_positive_samples', true) //TODO: change to false
optionMap.set('_geographic_region', 'na')

//Fetch the extension options
function loadoptions(){
    const options = {}

    const optionPromises = []

    for(let key of optionMap.keys()){
        optionPromises.push(browser.storage.sync.get(key)
        // Use saved option key or default
        .then(result=>key in result?options[key]=result[key]:options[key]=optionMap.get(key)))
    }
    
    return Promise.all(optionPromises).then(()=>{
        console.log('loaded everything', options)
        return options
    })
}

loadoptions().then(options=>{

    //Create the informly context for the page
    let ctx = {}

    //SETUP EVENT LISTENERS

    // Detect typing in a textbox.
    document.addEventListener('keydown', (event)=>handleTextboxInput(event, options, ctx))

    // Register listener for 'informly-show', triggered when a user hovers over higlighted misinformation.
    document.addEventListener('informly-show', (event)=>handleInformlyShow(event, options, ctx))

    // Register listener for 'informly-hide', triggered when a user moves the mouse off the informly box.
    document.addEventListener('informly-hide', (event)=>handleInformlyHide(event, options, ctx))

    // Register listener for 'informly-show-submit', triggered when a user interacts with any of the inputs on the informly box.
    document.addEventListener('informly-show-submit', (event)=>handleShowSubmit(event, options, ctx))

    // Register listener for  'informly-submit', triggered when a user clicks submit on the informly box.
    document.addEventListener('informly-submit', (event)=>handleSubmit(event, options, ctx))

    // Register listener for page scrolling, informly needs to move the ghostbox around for things to work properly
    document.addEventListener('scroll', (event)=>handleScroll(event, options, ctx))

    // Register listener for 'paste', triggered when a user initiates the paste action. We fire off the textbox handler, just in case it was the target of the paste.
    // TODO
    //document.addEventListener('paste', (event)=>{})
    console.log('Informly loaded!')

})

// HANDLERS

function handleScroll(event, options, ctx){
    if (ctx.ghostbox){ //If a ghostbox has been defined
        ctx.ghostbox.place()

        // console.log('haunter.x', ctx.ghostbox.textbox.getBoundingClientRect().x,
        //     'haunter.y', ctx.ghostbox.textbox.getBoundingClientRect().y,
        //     'hauntee.x', box_position.x,
        //     'hauntee.y', box_position.y
        // )
    }

    //Move all the informly boxes too!
    $('[informly-type="informly-info"]')
        .filter((index, element)=>element.hasAttribute('zone-id'))
        .each((index,element)=>{
            // console.log('element:', element)
            const zoneId = element.getAttribute('zone-id')
            // console.log('zone-id', zoneId)
            const zone = getZoneById(element.getAttribute('zone-id'))
            // console.log('zone', zone)
            placeElementByTarget(element, getZoneById(element.getAttribute('zone-id')))

        })
}

function handleSubmit(event, options, ctx){

    //Extract event info and user input
    const misinfoId = event.detail.misinfoId
    const urlSource = $('#' + misinfoId + '-url-source').val()
    const falsePositive = $('#' + misinfoId + '-false-positive-flag').val() === 'on'

    console.log('Got submission for ', misinfoId, ' urlSource:', urlSource, ' falsePositive', falsePositive)

    //Find misinfo record in storage if it exists.
    browser.storage.local.get('dataset').then(
        result=>{
            if(result === undefined|| isEmptyObject(result)){
                return Promise.reject('No records to update!')
            }

            // Update the corresponding record
            const record = result.dataset.find(r=>r.id === misinfoId)
            if(record){
                record.byUserSourceUrl = urlSource //Store the url where the user leanred this claim
                record.byUserIsMisinfo = !falsePositive //Store the user's perspective on whether this is misinfo or not.
                
                return creditBytes(record) //Give the user extra credit for interacting with the informly box
                .then(()=>Promise.resolve(result.dataset)) // Resolve the promise with the updated dataset.
            }

            return Promise.reject('Could not find record for: '+ misinfoId)
        }
    ).then(dataset=>browser.storage.local.set({dataset})) //And save the changes in local storage!
    .then(()=>{
        //Hide other informly box sections
        $('#' + misinfoId + '-info-header').css({'display':'none'})
        $('#' + misinfoId + '-info-body').css({'display':'none'})
        $('#' + misinfoId + '-info-footer').css({'display':'none'})
        $('#' + misinfoId + '-submit').css({'display':'none'})
        //Show thanks splashscreen
        $('#' + misinfoId + '-thanks').css({'display':'block'})

        console.log("_thank_timeout:", options._thank_timeout  )

        //Disable the corresponding zones
        ctx.ghostbox.markSubmitted(misinfoId)

        //After a brief delay, destroy the info box
        setTimeout(()=>{
            removeInformlyInfoBox(misinfoId)
        }, options._thank_timeout)

        console.log('handled submit!')
    })


}

function handleShowSubmit(event, options, ctx){
    //Reveal the submit button for the appropriate informly box
    const misinfoId = event.detail.misinfoId
    $('#' + misinfoId + '-submit').css({"display": "block"})
}

function handleInformlyHide(event, options, ctx){

    const misinfoId = event.detail.misinfoId
    hideInformlyInfo(misinfoId, ctx)
    console.log("informly HIDE!", event)
    return

}


function handleInformlyShow(event, options, ctx){


    //Reset hide timeout if the mouse is over the text again.
    if(_INFORMLY_HIDE_INFO_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_HIDE_INFO_TIMEOUT)
    }

    console.log("informly SHOW!", event)
    const misinfoId = event.explicitOriginalTarget.getAttribute('misinfo-id')
    const zoneId = event.explicitOriginalTarget.getAttribute('zone-id')
    

    ctx.ghostbox.resetAllZonesExcept(zoneId)
    //Clear all informly infos (make sure we don't clutter the screen)
    hideAllInformlyInfosExcept(misinfoId)
    showInformlyInfo(misinfoId, zoneId) //event.detail.misinfoId has the misinfoId
}

function handleTextboxInput(event, options, ctx){
    console.log('event: ', event)
    // Only do something if text is being entered into a textbox that is an informly target.
    if (logic.isInformlyTarget(event, ctx)){

        console.log('event.target: ', event.target, 'key', event.key, ' text content: ', event.target.textContent)
        
        // If more typing occurs, clear the timeout if it has been defined.
        if (_INFORMLY_CHATGPT_TIMEOUT !== undefined){
            clearTimeout(_INFORMLY_CHATGPT_TIMEOUT)
        }
    

            
        //Clear informly infos
        hideAllInformlyInfos()

        // set a timeout to send the comment to chat gpt after a preset delay
        // _INFORMLY_CHATGPT_TIMEOUT = setTimeout(()=>triggerCheck(event.target), options._input_timeout)
        _INFORMLY_CHATGPT_TIMEOUT = setTimeout(
            ()=>createMisinfoRecord(event.target.textContent, event, options)
                .then(result=>updateGhostboxBefore(result, event, ctx))
                .then(result=>logic.firstPassValidation(result, options, ctx))
                .then(result=>logic.preProcessInput(result, options))
                .then(result=>logic.isRelevant(result))
                .then(result=>result.isRelevant?logic.chatGPTCheck(result, options, ctx): Promise.reject("Text was not relevant"))
                .then(result=>result.chatGPTResponse?logic.chatGPTResponseClassifier(result):Promise.reject('No chatgpt response'))
                .then(result=>persist(result, options))
                .then(result=>result.isMisinfo?injectInformlyInfo(result, event):Promise.reject('No misinfo'))
                .then(result=>logic.highlightText(result, event))
                .then(result=>updateGhostboxAfter(result, event, ctx))
                .catch(reason=>console.log(reason))
            , options._input_timeout)
    }
}


/**
 * ASSEMBLE EXTENSION LOGIC HERE
 * Following the Comment Verification Flow (see README), 
 * each blue diamond and green rectangle corresponds with a function you can customize here.
 */
let logic = {
    /**
     * This is passed the event emitted by key up. The task of this function 
     * is to determine if the event was emitted from a textbox that informly 
     * should be invoked for. 
     * 
     * Expected return value: true/false
     */
    isInformlyTarget: checkTargetRecursively,
    /**
     * This function is given a pre-processed input object, and must determine 
     * if the kind of text/preprocessing artifacts extracted, warrent misinformation checking.
     * 
     * For example, comments that are expressions of personal opinion shouldn't be checked for misinformation.
     * 
     * Expected return value: A resolved promise containing the input object ammended with an input.isRelevant flag.
     */
    isRelevant: relevanceCheckV1,
    chatGPTResponseClassifier: classifierV1,
    preProcessInput: dbpediaSpotlightPreProcess,
    chatGPTCheck: basicChatGPTCheck,
    highlightText: dummyHighlightText,
    firstPassValidation: firstPassValidationV1
}

// LOGIC IMPLEMENTATIONS


// For debugging predicates
function alwaysTrue(event){
    return true
}

// For debugging logic
function passthrough(input){
    return input
}

function dummyFirstPassValidation(record, options, ctx){
    return Promise.resolve(record)
}

function firstPassValidationV1(record, options, ctx){
    /**
     * Let's say that a complete snippet must:
     *  * Have at least some number of sentence(s). 
     *  * Be at least some number of characters long.
     *  * TODO: Not be more than 900 words. (DBPedia spotlight limit)
     */
    if(record.snippet.text.length < options._min_snippet_length){
        console.log('Snippet is too short! Got ', record.snippet.text.length, ' need at least ', options._min_snippet_length )
        //Discard snippet: This way this text is considered again in the future when it might be complete.
        ctx.ghostbox.discardSnippet()
        return Promise.reject('Snippet is too short!')
    }

    // const sentenceRegex = new RegExp('((\\w+)[\\s.])+', 'gim')
    const sentences = splitSentences(record.snippet.text)
    // const sentences = [...record.snippet.text.matchAll(sentenceRegex)] 
    const numSentences = sentences.length
    if( numSentences < options._min_sentences){
        console.log("Snippet contains too few sentences. Got ", numSentences, " need at least ", options._min_sentences)
        //Discard the snippet: This way this text is considered again in the future when it might be complete.
        ctx.ghostbox.discardSnippet()
        return Promise.reject('Snippet contains too few sentences.')
    }

    //TODO: this probably shouldn't be done here, but since I have the data and it's kinda nifty
    record.snippet.sentences = sentences

    return Promise.resolve(record)
}

/**
 * Do something to the record before processing
 * @param {*} record 
 * @returns 
 */
function dummyPreProcess(record){
    return Promise.resolve(record)
}

// Be nice to dbpedia spotlight when debugging
function dummyDbpediaSpotlightPreProcess(record, options){
    record.snippet.surfaceForms = ['nasa']
    return Promise.resolve(record)
}

//TODO: rename
function dbpediaSpotlightPreProcess(record, options){

        //Extract reddit post title
        record.redditTitle = $('h1')[0].textContent
        
        //Extract subreddit
        const subredditRegex = new RegExp('(?<=r\\/)([a-zA-z0-9_]*)', 'gm')
        record.subreddit = window.location.href.match(subredditRegex)[0]

        const commentText = encodeURIComponent(record.snippet.text)

        return fetch(options._dbpedia_spotlight_url + "/spot?text=" + commentText + '&confidence=0.5', {
            method: "GET"
        })
        .then(result=>result.text())
        .then(result=>new window.DOMParser().parseFromString(result, "text/xml"))
        .then(spotlightResponse=>{
            console.log('spotlightResponse', spotlightResponse)
            //Extract surface forms
            record.snippet.surfaceForms = extractSurfaceForms(spotlightResponse)
        })
        .then(()=>Promise.resolve(record))

}

function relevanceCheckV1(record){

    /**
     * Let's say a relevant snippet must:
     *  * Have at least 1 surface form (be about a person, place or thing).
     */
    if(record.snippet.surfaceForms.length <= 0){
        record.isRelevant = false
        console.log('Snippet does not contain any surface forms!')
        return Promise.resolve(record)
    }

    record.isRelevant = true
    record.textToCheck = record.snippet.text
    console.log('text is relevant!', record.snippet.text)
    return Promise.resolve(record)
}

/**
 * Need to produce input.isRelevant
 * @param {*} input 
 * @returns 
 */
function dummyRelevanceCheck(input){
    input.isRelevant = true
    return Promise.resolve(input)
}

/**
 * Inserts the infobox for the current record into the page. 
 * 
 * Must return the promise of the record when done
 * @param {*} record 
 * @param {*} event 
 * @returns 
 */
function injectInformlyInfo(record, event){
    return buildInformlyInfo(record.chatGPTResponse, record.id, record.bytes).then(fragment=>{
        document.documentElement.appendChild(fragment)
    }).then(result=>Promise.resolve(record))
}

/**
 * 
 * Highlights trimmed snippets, for debugging
 * 
 * @param {*} input 
 * @param {*} event 
 */
function dummyHighlightText(input, event){
    input.snippet.highlight = input.snippet.text.trim()
    return Promise.resolve(input)
}

/**
 * Looks through parentElements until it finds one whose role is set to textbox.
 * 
 * A function like this is critical so the addon doesn't invoke on the content of the 
 * whole page if the user hits the spacebar or something.
 * 
 * @param {*} event emitted 'keydown' event
 * @param {*} ctx informly context
 */
function checkTargetRecursively(event,ctx){

    return hasTextboxRole(event.target)
    
}

/**
 * Let's say that gpt thinks it's misinfo if:
 *  * 'There is' and 'misinformation' appear in the first sentence.
 *  * 'There is no' does not appear in the first setence.
 *  * 'does not contain' does not appear in the first sentence.
 * @param {*} record 
 * @returns 
 */
function classifierV1(record){
    const sentenceRegex = new RegExp('((\\w+)[\\s.])+', 'gim')
    const gptOutput = record.chatGPTResponse

    // const sentences = [...gptOutput.matchAll(sentenceRegex)]
    const sentences = splitSentences(gptOutput)

    const isMisinfoTokens = ['There is', 'not entirely accur','claims that are not entirely accur', 'There are', 'misinformation', 'inaccura', 'not true', 'is false']
    const notMisinfoTokens = ['There is no', 'no misinformation', 'no inaccura', 'There are no']

    const isMisinfoFullTextTokens = ['no evidence', 'it is not accur', 'not supported by evidence', 'is also false', 'debunked', 'It is misinformation']

    let includesIsTokens = false
    let includesNotTokens = false

    for (token of isMisinfoTokens){
        if (sentences[0].includes(token)){
            includesIsTokens = true
        }
    }

    for (token of isMisinfoFullTextTokens){
        if(gptOutput.includes(token)){
            includesIsTokens = true
        }
    }

    for (token of notMisinfoTokens){
        if (sentences[0].includes(token)){
            includesNotTokens = true
        }
    }

    if(includesIsTokens && !includesNotTokens){
        record.isMisinfo = true
    }else{
        record.isMisinfo = false
    }

    return Promise.resolve(record)
}

/**
 * For debugging 
 * Expect input.chatGPTResponse to be output from chatGPT
 * 
 * Need to return input.isMisinfo
 * @param {*} input 
 * @returns 
 */
function simpleClassifier(input){

    if(input.chatGPTResponse.includes('contains misinformation')){
        input.isMisinfo = true
    }else{
        input.isMisinfo = false
    }

    return Promise.resolve(input)
}

/**
 * For debugging
 * Need to return record.chatGPTResponse
 * @param {*} record 
 * @returns 
 */
function dummyChatGPTCheck(record){
    record.chatGPTResponse = "There are a few inaccuracies in this statement. Firstly, Trump is not being prosecuted for repaying his attorney for a settlement. He is being investigated for potential campaign finance violations related to payments made to women who claimed to have had affairs with him. Secondly, there is no evidence that Biden has committed any actual crimes. The allegations against him and his son Hunter regarding their dealings in Ukraine have not been substantiated. Finally, while it is true that the justice system should not be used for political purposes, it is also important to investigate and hold accountable those who may have broken the law, regardless of their political affiliations. Ultimately, it is up to the justice system to determine whether or not a crime has been committed, not just the voters."
    return Promise.resolve(record)
}

/**
 * Expect record.isRelevant flag to be set
 * Expect content to send to chatGPT in record.textToCheck
 * 
 * Need to return record.chatGPTResponse
 * @param {*} record 
 */
function basicChatGPTCheck(record, options){

    const headers = {
        "OpenAI-Organization":"org-qRCRUPAKr7f9yoyNSQMZz1VG", //TODO: add to options
        "Authorization": "Bearer " + options._openai_key
    }

    if (options._openai_org){ // This header is optional, only insert if provided.
        headers['OpenAI-Organization'] = options._openai_org
    }

    return postData(options._openai_url, completionWrapperV2_1(record.redditTitle, record.subreddit, record.textToCheck),headers)
           .then(response=>Promise.resolve(extractChatGPTResponse(response)))
           .then(response=>{
                record.chatGPTResponse = response
                return Promise.resolve(record)
            })
}

/**
 * Initializes the ghostbox if it doesn't exist, subsequent calls facilitate snippet management.
 * @param {*} record 
 * @param {*} event 
 * @param {*} ctx informly context containing the ghostbox
 * @returns 
 */
function updateGhostboxBefore(record, event, ctx){

    let hauntee = event.target
    console.log('hauntee', hauntee)
    let box_position = hauntee.getBoundingClientRect()

    //If the ghostbox doesn't exist, set it up now
    if (ctx.ghostbox === undefined){
        //Figure out padding so our ghostbox can match it.
        let pt = window.getComputedStyle(hauntee, null).getPropertyValue('padding-top')
        let pb = window.getComputedStyle(hauntee, null).getPropertyValue('padding-bottom')
        let pl = window.getComputedStyle(hauntee, null).getPropertyValue('padding-left')
        let pr = window.getComputedStyle(hauntee, null).getPropertyValue('padding-right')
        //Figure out the font being used so our ghostbox can match it.
        let font = window.getComputedStyle(hauntee, null).getPropertyValue('font')
        ctx.ghostbox = new GhostBox( 
            box_position.x,
            box_position.y,
            box_position.width,
            box_position.height,
            font,
            pt,
            pb,
            pl,
            pr,
            hauntee //the hauntee gets haunted :) <we use this to update ghostboxes on scroll>
            )
    }else{
        //Sometimes the position or size changes, adjust to that.
        if (box_position.x !== ctx.ghostbox.hauntee.getBoundingClientRect().x){
            //Update the hauntee if the positions don't match
            ctx.ghostbox.hauntee = hauntee
        }
        ctx.ghostbox.setPosition(box_position.x, box_position.y, box_position.width, box_position.height)
    }
    ctx.ghostbox.place()

    //Define snippet for processing in the pipeline
    record.snippet = ctx.ghostbox.handleUserUpdate(record.originalText, record)
    console.log("record.snippet set to: ", record.snippet)

    //Define the number of bytes the snippet is worth
    record.bytes = new Blob([record.snippet.text]).size
    console.log('ghostbox before', ctx.ghostbox)

    return Promise.resolve(record)
}

/**
 * After processing is complete, invoke the ghostbox to render appropriate UI elements.
 * @param {*} record 
 * @param {*} event 
 * @param {*} ctx 
 */
function updateGhostboxAfter(record, event, ctx){
    console.log('ghostbox After:', ctx.ghostbox)

    ctx.ghostbox.place()
    ctx.ghostbox.updateContent()

}


/**
 * Capture misinformation records if user options allow
 * @param {*} input 
 * @param {*} options 
 * @returns 
 */
function persist(input, options){


    if((input.isMisinfo && options._allow_positive_samples)
        || (!input.isMisinfo && options._allow_negative_samples)
    ){

        return browser.storage.local.get('dataset').then(
            result=>{
                if(result === undefined|| isEmptyObject(result)){
                    dataset = []
                    dataset.push(input)
                    return Promise.resolve(dataset)
                }else{
                    console.log('browser.storage.local.records: ', result)
                    result['dataset'].push(input)
                    return Promise.resolve(result.dataset)
                }
            }
        ).then(dataset=>browser.storage.local.set({dataset}))
        .then(()=>creditBytes(input)) //Give the user some bytes for building a dataset
        .then(()=>{
            console.log("Record saved!")
            return Promise.resolve(input)
        })
    }

    return Promise.resolve(input)
}

function createMisinfoRecord(inputText, event, options){

    let misinfoRecord = {}
    misinfoRecord.originalText = inputText
    misinfoRecord.id = uuidv4()
    misinfoRecord.timestamp = Date.now()
    misinfoRecord.isMisinfo = undefined
    misinfoRecord.byUserIsMisinfo = undefined
    misinfoRecord.originUrl = window.location.href
    misinfoRecord.byUserSourceUrl = undefined
    misinfoRecord.isRelevant = undefined
    misinfoRecord.textToCheck = undefined
    misinfoRecord.chatGPTResponse = undefined
    misinfoRecord.geographicRegion = options._geographic_region
    misinfoRecord.bytes = undefined
    

    return Promise.resolve(misinfoRecord)
}



// UTILITY FUNCTIONS
//https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
function isEmptyObject(obj){
    return obj // 👈 null and undefined check
        && Object.keys(obj).length === 0
        && Object.getPrototypeOf(obj) === Object.prototype
}

// Shamelessly taken from:
// https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}


// Returns the informly info container with id if it is in the DOM.
function getInformlyInfoElement(misinfoId){
    return $('[informly-type="informly-info"][misinfo-id="'+misinfoId+'"]')[0]
}

function hideInformlyInfo(misinfoId, ctx){
    const element = getInformlyInfoElement(misinfoId)
    element.style.display = 'none'
    ctx.ghostbox.resetZoneById(element.getAttribute('zone-id'))
}

function showInformlyInfo(misinfoId, zoneId){
    const element = getInformlyInfoElement(misinfoId)
    element.setAttribute('zone-id', zoneId)
    placeElementByTarget(element, getZoneById(zoneId))
    element.style.display = 'block'
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// Example POST method implementation:
function postData(url = "", data = {}, extraHeaders={}) {
    console.log("Sending request: ", data)
    const baseHeaders = {
        "Content-Type": "application/json"
    }

    const finalHeaders = {...baseHeaders, ...extraHeaders}

    try{
        // Default options are marked with *
        const response = fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.,
        headers: finalHeaders,
        body: JSON.stringify(data), // body data type must match "Content-Type" header
        });
        
        return response.then(result=>Promise.resolve(result.json())); // parses JSON response into native JavaScript objects
    }catch(e){
        console.error(e)
    }
    
  }


function getZoneById(zoneId){
    return $('[zone-id="'+zoneId+'"][informly-type="zone"]')[0]
}


function extractChatGPTResponse(response){
    return response.choices[0].message.content
}

//v2.1 completions wrapper
function completionWrapperV2_1(redditTitle, subreddit, sampleText){
    const result = {
        "model": "gpt-3.5-turbo-0301",
        "messages": [
            {"role": "system", "content": `You are fact checking comments on a reddit post with the title '${redditTitle}' that was posted on the '${subreddit}' subreddit. `},
            {"role": "user", "content": `Does the following text contain misinformation?  '${sampleText}'`}
        ],
        "temperature": 0,
        "n": 1,
        "max_tokens": 200,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    return result
}

//v2 completions wrapper
function completionWrapperV2(redditTitle, subreddit, sampleText){
    return fetch(_INFORMLY_MISINFO_PROMPT_TEMPLATE_URL)
    .then(template_data=>template_data.text())
    .then(raw_template=>Promise.resolve(raw_template.replace("{#REDDIT_TITLE#}", redditTitle)))
    .then(raw_template=>Promise.resolve(raw_template.replace('{#SUBREDDIT#}', subreddit)))
    .then(raw_template=>Promise.resolve(raw_template.replace('{#SAMPLE#}', sampleText)))
    .then(raw_template=>Promise.resolve(JSON.parse(raw_template)))
}


//v1 completions wrapper
function completionWrapperV1(content){
    let prompt = options._prompt_prefix + content
    let result = {
        "model": "gpt-3.5-turbo-0301",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
        "n": 1,
        "max_tokens": 100,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    return result
}

 function buildInformlyInfo(content, misinfoId, bytes){
    // Load the template
    return fetch(_INFORMLY_INFO_TEMPLATE_URL)
        .then(template_data=>template_data.text())
        .then(template_html=>Promise.resolve(template_html.replace("{#TOKEN#}", content)))
        .then(template_html=>Promise.resolve(template_html.replaceAll("{#MISINFO_ID#}", misinfoId)))
        .then(template_html=>Promise.resolve(template_html.replace("{#BYTES#}", bytes)))
        .then(template=>{
            var temp = document.createElement('template')
            temp.innerHTML = template
            temp.content.firstChild.setAttribute('misinfo-id', misinfoId )
            temp.content.firstChild.style['z-index'] = 1001 //sit above highlights
            return Promise.resolve(temp.content)
        })
}

function placeHighlight(highlight, target){
    targetPositionRect = target.getBoundingClientRect()

    highlight.style.position = 'absolute'
    highlight.style.left = targetPositionRect.left + 'px'
    highlight.style.top = (targetPositionRect.top ) + 'px'
}

// Used to place informly box by highlighted text.
function placeElementByTarget(element, target){

    targetPositionRect = target.getBoundingClientRect()

    element.style.position = 'absolute'
    element.style.left = targetPositionRect.left + 'px'
    element.style.top = (window.scrollY + targetPositionRect.top + target.offsetHeight + 3 ) + 'px'
}


function removeAllInformlyInfosExcept(misinfoId){
    $('[informly-type="informly-info"]').remove(e=>e.getAttribute('misinfo-id') !== misinfoId)
}

function removeInformlyInfoBox(misinfoId){
    $('[informly-type="informly-info"][misinfo-id="'+misinfoId+'"]').remove()
}

function hideAllInformlyInfosExcept(misinfoId){
    console.log('hiding all informly infos except for ', misinfoId)
    $('[informly-type="informly-info"][misinfo-id!="'+misinfoId+'"]')
    .css({'display':'none'})
}

function removeAllInformlyInfos(){
    $('[informly-type="informly-info"]').remove()
}

function hideAllInformlyInfos(){
     $('[informly-type="informly-info"]').css({"display":"none"})
}


/**
 * 
 * @param {*} element 
 * @returns true if the element or one of it's ancestors has the textbox role.
 */
function hasTextboxRole (element){
    if (element && element.hasAttribute('role') && element.getAttribute('role') === 'textbox'){
        return element
    }else if(element.parentElement){
        return hasTextboxRole(element.parentElement)
    }else{
        return false
    }
}

function creditBytes(record){
    //Credit the user the appropriate number of bytes
    return browser.storage.local.get('user').then(result=>{
        if (result === undefined || isEmptyObject(result)){
            const data = {bytes: record.bytes }
            return Promise.resolve(data)
        }

        result.user.bytes += record.bytes
        return Promise.resolve(result.user)
    }).then(user=>browser.storage.local.set({user}))
    .then(()=>Promise.resolve(record))
}

function extractSurfaceForms(spotlightResponse){
    const result = []
    for (const element of spotlightResponse.getElementsByTagName('surfaceForm')){
        result.push(element.getAttribute('name'))
    }
    return result
}

function splitSentences(input){
    const regex = new RegExp('[.?!]', 'gmi')
    result = input.split(regex)
    const hasPunctuation = input.match(regex)
    if(hasPunctuation){
        return result
    }else{
        return []
    }
}