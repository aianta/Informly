



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

    let ctx = {}

    //SETUP EVENT LISTENERS

    //Detect typing in a textbox.
    //TODO: keyup is not a good event for this, if the user holds the key down it will execute early
    document.addEventListener('keydown', (event)=>handleTextboxInput(event, options, ctx))

    // Register listener for 'informly-show', triggered when a user hovers over higlighted misinformation.
    document.addEventListener('informly-show', (event)=>handleInformlyShow(event, options))

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


function handleInformlyShow(event, options){


    //Reset hide timeout if the mouse is over the text again.
    if(_INFORMLY_HIDE_INFO_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_HIDE_INFO_TIMEOUT)
    }

    console.log("informly SHOW!", event)
    const misinfoId = event.explicitOriginalTarget.getAttribute('misinfo-id')
    const zoneId = event.explicitOriginalTarget.getAttribute('zone-id')
    
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
    
        //If we haven't sent this before. Use this to avoid, accidental overuse of API
        if(!sent||true){
            
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


}

var sent = false

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
    highlightText: simpleHighlightText
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

function injectInformlyInfo(record, event){
    return buildInformlyInfo(record.chatGPTResponse, record.id).then(fragment=>{
        document.documentElement.appendChild(fragment)
    }).then(result=>Promise.resolve(record))
}

/**
 * Expect input.chatGPTResponse to be output from chatGPT 
 * 
 * Highlights entire comment
 * @param {*} input 
 * @param {*} event 
 */
function simpleHighlightText(input, event){
    input.snippet.highlight = input.snippet.text.trim()

    return Promise.resolve(input)
    let originalText = event.target.textContent
    let commentElement = fetchElementWithText(originalText)

    // let tempTemplate = document.createElement('template')
    tempTemplate.innerHTML = "<span record-id='"+input.id+
        "' contenteditable=\"true\" onmouseover='document.dispatchEvent(new CustomEvent(\"informly-show\", "+input.id+
        "))' style='background-color: yellow; text-decoration-line: underline; text-decoration-color: red; text-decoration-style: wavy'>"+input.textToCheck+
        "</span><span contenteditable=\"true\"></span>"
    
    // event.target.appendChild(tempTemplate.content)
    

    // commentElement.innerHTML = commentElement.innerHTML.replace(input.textToCheck, 
    //     "<span record-id='"+input.id+
    //     "' contenteditable=\"true\" onmouseover='document.dispatchEvent(new CustomEvent(\"informly-show\", "+input.id+
    //     "))' style='background-color: yellow; text-decoration-line: underline; text-decoration-color: red; text-decoration-style: wavy'>"+input.textToCheck+
    //     "</span><span contenteditable=\"true\"></span>")

    event.target.selectionStart = event.target.selectionEnd = originalText.length
    // commentElement.focus()
    // commentElement.setAttribute('informly-target', 'comment-box-informly')
    //commentElement.selectionStart = commentElement.selectionEnd = commentElement.value.length
    //placeCaretAfterNode(commentElement.lastChild)
    // $('[informly-target="comment-box-informly"]').selectRange(originalText.length)
    
    let boundingBox = commentElement.getBoundingClientRect()
    let highlight = createHighlight(boundingBox.width, boundingBox.height, 'informly-dummy-highlight')
    placeHighlight(highlight, commentElement)

    console.log("UPDATED HTML")



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
 * Need to return input.chatGPTResponse
 * @param {*} input 
 * @returns 
 */
function dummyChatGPTCheck(input){
    input.chatGPTResponse = "contains misinformation"
    return Promise.resolve(input)
}

/**
 * Expect input.isRelevant flag to be set
 * Expect content to send to chatGPT in input.textToCheck
 * 
 * Need to return input.chatGPTResponse
 * @param {*} input 
 */
function basicChatGPTCheck(input){
    sent = true //TODO remove this eventually
    return postData(options._openai_url, completionWrapperV1(input.textToCheck))
           .then(response=>Promise.resolve(extractChatGPTResponse(response)))
           .then(response=>{
                input.chatGPTResponse = response
                return Promise.resolve(input)
            })
}

function updateGhostboxBefore(record, event, ctx){
    //let box_position = $('div[data-contents="true"]')[0].getBoundingClientRect()
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

function updateGhostboxAfter(record, event, ctx){
    console.log('ghostbox After:', ctx.ghostbox)
    ctx.ghostbox.updateContent()
}

/**
 * Keep track of what text snippets have been processed for a given textbox.
 */
function precheckBookkeeping(record, event){
    
    let informlyId = event.target._informlyId
    if(informlyId === undefined){ //Bind an _informlyId to the emitting element
        informlyId = uuidv4()
        event.target._informlyId = informlyId
    }

    browser.storage.local.get('scannedTexts').then()

    /**
     * Building up a 'scannedTexts' object in local storage that looks like this
     * {
     *  '<textbox-informly-id>: [<array of text snippets already scanned>]
     * }
     * 
     * The purpose of this is to avoid sending text we already scanned to chatGPT
     * again. 
     */

    return browser.storage.local.get('scannedTexts').then(
        result=>{
            console.log('got scannedTexts=', result)
            if(result === undefined || isEmptyObject(result)){
                let scannedTexts = {}
                scannedTexts[informlyId] = []
                scannedTexts[informlyId].unshift(record.originalText)
                return Promise.resolve(scannedTexts)
            }else{
                scannedTexts = result.scannedTexts
                if (scannedTexts[informlyId] === undefined){
                    scannedTexts[informlyId] = []
                    scannedTexts[informlyId].unshift(record.originalText)
                    record.textToCheck = record.originalText
                    return Promise.resolve(scannedTexts)
                }else{
                    //If we have previous snippets for this text box.
                    let alreadyScanned = ''
                    let temp = []
                    //Go through all of them
                    while(scannedTexts[informlyId].length > 0){
                        snippet = scannedTexts[informlyId].pop()
                        temp.unshift(snippet)
                        alreadyScanned += snippet
                        //Checking to see how many of them have remained the same
                        if (record.originalText.startsWith(alreadyScanned)){
                            continue
                        }else{
                            //What to do if something was removed
                            console.log('Previously scanned text has been changed! Expected:', alreadyScanned, 'but got: ', record.originalText)
                            //get back the last successful alreadyScanned by removing the snippet that made the if condition fail.
                            alreadyScanned = alreadyScanned.substring(0, (alreadyScanned.length - snippet.length))
                            //Undo the unshift in temp
                            temp.shift()
                            //purge (any) other saved snippets for this textbox as we can't rely on them being valid anymore
                            //https://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript
                            scannedTexts[informlyId].splice(0,scannedTexts[informlyId].length)
                            
                            console.log('reverted alreadyScanned:', alreadyScanned, ' reverted temp:', temp)

                            break
                        }
                    }
                    //Reset the result[informlyId] array using temp
                    scannedTexts[informlyId] = scannedTexts[informlyId].concat(temp)

                    //Determine the new portion of the input and put it in record.textToCheck
                    record.textToCheck = record.originalText.substring(alreadyScanned.length)

                    console.log('New snippet', record.textToCheck)

                    //Add the new portion of the input as a seen before snippet.
                    scannedTexts[informlyId].unshift(record.textToCheck)
                    //Return the updated 'scannedTexts' object to save
                    return Promise.resolve(scannedTexts) 
                }
                
            }
        }
    ).then(scannedTexts=>browser.storage.local.set({scannedTexts}))
    .then(result=>Promise.resolve(record)) //Pass the record along
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

function getHighlight(id){
    const xpath = "//div[@id='"+id+"']"
    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    return element
}

// Returns the informly info container if it is in the DOM.
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
    //var xpath = "//div[zone-id=\""+zoneId+"\"]"
    return $('[zone-id="'+zoneId+'"][informly-type="zone"]')[0]
    var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    return result
}

// https://stackoverflow.com/questions/3813294/how-to-get-element-by-innertext
function fetchElementWithText(text){
    //On reddit.com this is a span.
    //TODO fix case where text contains quote.
    var xpath = "//span[text()=\""+text+"\"]"
    console.log("xpath: ",xpath)
    var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue
    return result
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

//https://stackoverflow.com/questions/15813895/set-cursor-after-span-element-inside-contenteditable-div
function placeCaretAfterNode(node) {
    if (typeof window.getSelection != "undefined") {
        var range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function createHighlight(width, height, id){
    let highlightTemplate = document.createElement("template")
    highlightTemplate.innerHTML = "<div id=\""+id+"\" onmouseover='document.dispatchEvent(new CustomEvent(\"informly-show\"))'></div>"
    
    let highlightElement = highlightTemplate.content
    document.documentElement.appendChild(highlightElement)
    highlightElement = getHighlight(id)
    highlightElement.style.display = 'block'
    highlightElement.style.backgroundColor = 'yellow'
    highlightElement.style.opacity = 0.5
    highlightElement.style.width = width + "px"
    highlightElement.style.height = height + "px"
    highlightElement.style['z-index'] = 1000

    return highlightElement

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