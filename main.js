const _INFORMLY_INFO_TEMPLATE_URL = browser.runtime.getURL('templates/informly_check_info.html')

//DEFINE TIMEOUTS
var _INFORMLY_CHATGPT_TIMEOUT
var _INFORMLY_HIDE_INFO_TIMEOUT

// Define an option map of default values to use in case of undefined.
// TODO: unduplicate this.
const optionMap = new Map()
optionMap.set('_openai_key', '')
optionMap.set('_openai_url','https://api.openai.com/v1/chat/completions')
optionMap.set('_prompt_prefix', 'Does the following comment contain misinformation: ')
optionMap.set('_input_timeout', 5000)
optionMap.set('_fade_timeout', 2000)
optionMap.set('_allow_negative_samples', true) //TODO: change to false
optionMap.set('_allow_positive_samples', true) //TODO: change to false
optionMap.set('_geographic_region', 'na')

//Fetch the extension options
function loadoptions(){
    const options = {}

    const optionPromises = []

    for(let key of optionMap.keys()){
        optionPromises.push(browser.storage.sync.get(key).then(result=>options[key]=result[key]))
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

    //Detect typing in a textbox.
    document.addEventListener('keydown', (event)=>handleTextboxInput(event, options, ctx))

    // Register listener for 'informly-show', triggered when a user hovers over higlighted misinformation.
    document.addEventListener('informly-show', (event)=>handleInformlyShow(event, options, ctx))

    // Register listener for 'informly-hide', triggered when a user moves the mouse off the informly box.
    document.addEventListener('informly-hide', (event)=>handleInformlyHide(event, options, ctx))

    console.log('Informly loaded!')

})

// HANDLERS

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
    

    ctx.ghostbox.resetAllZonesExcept(misinfoId)
    //Clear all informly infos (make sure we don't clutter the screen)
    hideAllInformlyInfosExcept(misinfoId)
    showInformlyInfo(misinfoId, zoneId) //event.detail.misinfoId has the misinfoId
}

function handleTextboxInput(event, options, ctx){

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
                .then(result=>logic.preProcessInput(result))
                .then(result=>logic.isRelevant(result))
                .then(result=>result.isRelevant?logic.chatGPTCheck(result): Promise.reject('Text is not relevant'))
                .then(result=>result.chatGPTResponse?logic.chatGPTResponseClassifier(result):Promise.reject('No chatgpt response'))
                .then(result=>persist(result, options))
                .then(result=>result.isMisinfo?injectInformlyInfo(result, event):Promise.reject('Misinfo classification missing'))
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
    isRelevant: dummyRelevanceCheck,
    chatGPTResponseClassifier: simpleClassifier,
    preProcessInput: dummyPreProcess,
    chatGPTCheck: dummyChatGPTCheck,
    highlightText: dummyHighlightText
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

/**
 * Do something to the input before processing
 * @param {*} input 
 * @returns 
 */
function dummyPreProcess(input){
    return Promise.resolve(input)
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
    return buildInformlyInfo(record.chatGPTResponse, record.id).then(fragment=>{
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

    if (event.target.hasAttribute('is-informly-target')){
        return event.target.getAttribute('is-informly-target') === 'true'
    }

    if(hasTextboxRole(event.target)){
        event.target.setAttribute('is-informly-target', true)
        return true
    }else{
        event.target.setAttribute('is-informly-target', false)
        return false
    }

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
    record.chatGPTResponse = "contains misinformation"
    return Promise.resolve(record)
}

/**
 * Expect record.isRelevant flag to be set
 * Expect content to send to chatGPT in record.textToCheck
 * 
 * Need to return record.chatGPTResponse
 * @param {*} record 
 */
function basicChatGPTCheck(record){
    sent = true //TODO remove this eventually
    return postData(options._openai_url, completionWrapperV1(record.textToCheck))
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

    let box_position = event.target.getBoundingClientRect()
    //If the ghostbox doesn't exist, set it up now
    if (ctx.ghostbox === undefined){
        //Figure out padding so our ghostbox can match it.
        let pt = window.getComputedStyle(event.target, null).getPropertyValue('padding-top')
        let pb = window.getComputedStyle(event.target, null).getPropertyValue('padding-bottom')
        let pl = window.getComputedStyle(event.target, null).getPropertyValue('padding-left')
        let pr = window.getComputedStyle(event.target, null).getPropertyValue('padding-right')
        //Figure out the font being used so our ghostbox can match it.
        let font = window.getComputedStyle(event.target, null).getPropertyValue('font')
        ctx.ghostbox = new GhostBox( 
            box_position.x,
            box_position.y,
            box_position.width,
            box_position.height,
            font,
            pt,
            pb,
            pl,
            pr
            )
    }else{
        //Sometimes the position or size changes, adjust to that.
        ctx.ghostbox.setPosition(box_position.x, box_position.y, box_position.width, box_position.height)
    }
    ctx.ghostbox.place()

    record.snippet = ctx.ghostbox.handleUserUpdate(record.originalText, record)
    console.log("record.snippet set to: ", record.snippet)

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
function postData(url = "", data = {}) {
    console.log("Sending request: ", data)
    try{
        // Default options are marked with *
        const response = fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.,
        headers: {
        "Content-Type": "application/json",
        "OpenAI-Organization": "org-qRCRUPAKr7f9yoyNSQMZz1VG", //TODO: add to options
        "Authorization": "Bearer " + options._openai_key
        },
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

 function buildInformlyInfo(content, misinfoId){
    // Load the template
    return fetch(_INFORMLY_INFO_TEMPLATE_URL)
        .then(template_data=>template_data.text())
        .then(template_html=>Promise.resolve(template_html.replace("{#TOKEN#}", content)))
        .then(template_html=>Promise.resolve(template_html.replace("{#MISINFO_ID#}", misinfoId)))
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
    element.style.top = (targetPositionRect.top + target.offsetHeight + 3 ) + 'px'
}


function removeAllInformlyInfosExcept(misinfoId){
    $('[informly-type="informly-info"]').remove(e=>e.getAttribute('misinfo-id') !== misinfoId)
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
        return true
    }else{
        return hasTextboxRole(element.parent)
    }
}