const _INFORMLY_INFO_TEMPLATE_URL = browser.runtime.getURL('templates/informly_check_info.html')

//DEFINE TIMEOUTS
var _INFORMLY_CHATGPT_TIMEOUT
var _INFORMLY_HIDE_INFO_TIMEOUT


// Define an option map of default values to use in case of undefined.
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


    //SETUP EVENT LISTENERS

    //Detect typing in a textbox.
    document.addEventListener('keyup', (event)=>handleTextboxInput(event, options))

    // Register listener for 'informly-show', triggered when a user hovers over higlighted misinformation.
    document.addEventListener('informly-show', (event)=>handleInformlyShow(event, options))

    // Register listener for 'informly-hide', triggered when a user moves the mouse off the informly box.
    document.addEventListener('informly-hide', (event)=>handleInformlyHide(event, options))

    console.log('Informly loaded!')

})

// HANDLERS

function handleInformlyHide(event, options){
    console.log("informly HIDE!", event)
    
    // Reset Timeout
    if(_INFORMLY_HIDE_INFO_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_HIDE_INFO_TIMEOUT)
    }

    //Set a timeout, afterwhich hide the informly box
    _INFORMLY_HIDE_INFO_TIMEOUT = setTimeout(()=>hideInformlyInfo(), options._fade_timeout)
}


function handleInformlyShow(event, options){

    //Reset hide timeout if the mouse is over the text again.
    if(_INFORMLY_HIDE_INFO_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_HIDE_INFO_TIMEOUT)
    }

    console.log("informly SHOW!", event)
    showInformlyInfo()
}

function handleTextboxInput(event, options){

    // Only do something if text is being entered into a textbox that is an informly target.
    if (logic.isInformlyTarget(event)){

        console.log('event.target: ', event.target, 'key', event.key, ' text content: ', event.target.textContent)
        
        // If more typing occurs, clear the timeout if it has been defined.
        if (_INFORMLY_CHATGPT_TIMEOUT !== undefined){
            clearTimeout(_INFORMLY_CHATGPT_TIMEOUT)
        }
    
        //If we haven't sent this before. Use this to avoid, accidental overuse of API
        if(!sent){
    
            // set a timeout to send the comment to chat gpt after a preset delay
            // _INFORMLY_CHATGPT_TIMEOUT = setTimeout(()=>triggerCheck(event.target), options._input_timeout)
            _INFORMLY_CHATGPT_TIMEOUT = setTimeout(
                ()=>createMisinfoRecord(event.target.textContent, event, options)
                    .then(result=>logic.preProcessInput(result))
                    .then(result=>logic.isRelevant(result))
                    .then(result=>result.isRelevant?logic.chatGPTCheck(result):Promise.reject('Text not relevant'))
                    .then(result=>result.chatGPTResponse?logic.chatGPTResponseClassifier(result):Promise.reject('No chatgpt response'))
                    .then(result=>persist(result, options))
                    .then(result=>result.isMisinfo?logic.highlightText(result, event):Promise.reject('Misinfo classification missing'))
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
    isInformlyTarget: alwaysTrue,
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

/**
 * Expect input.chatGPTResponse to be output from chatGPT 
 * 
 * Highlights entire comment
 * @param {*} input 
 * @param {*} event 
 */
function simpleHighlightText(input, event){
    let originalText = event.target.textContent
    let commentElement = fetchElementWithText(originalText)
    commentElement.innerHTML = "<span onmouseover='document.dispatchEvent(new CustomEvent(\"informly-show\"))' style='background-color: yellow; text-decoration-line: underline; text-decoration-color: red; text-decoration-style: wavy'>"+originalText+"</span>"
    console.log("UPDATED HTML")

    buildInformlyInfo(input.chatGPTResponse).then(fragment=>commentElement.parentElement.appendChild(fragment))

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


// Returns the informly info container if it is in the DOM.
function getInformlyInfoElement(){
    xpath = "//div[@id='informly-info']"
    element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    return element
}

function hideInformlyInfo(){
    element = getInformlyInfoElement()
    element.style.display = 'none'
}

function showInformlyInfo(){
    element = getInformlyInfoElement()
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

// https://stackoverflow.com/questions/3813294/how-to-get-element-by-innertext
function fetchElementWithText(text){
    //On reddit.com this is a span.
    var xpath = "//span[text()='"+text+"']"
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

 function buildInformlyInfo(content){
    // Load the template
    return fetch(_INFORMLY_INFO_TEMPLATE_URL)
        .then(template_data=>template_data.text())
        .then(template_html=>Promise.resolve(template_html.replace("{#TOKEN#}", content)))
        .then(template=>{
            var temp = document.createElement('template')
            temp.innerHTML = template

            return Promise.resolve(temp.content)
        })
}