const _INFORMLY_PROMPT_HEADER = "Does the following comment contain misinformation: "
const _INFORMLY_OPENAI_COMPLETIONS_BASE_URL = "https://api.openai.com/v1/chat/completions"
const _INFORMLY_OPENAI_API_KEY = ""

const _INFORMLY_INFO_TEMPLATE_URL = browser.runtime.getURL('templates/informly_check_info.html')

//DEFINE DELAYS
const _INFORMLY_TIMEOUT_DELAY = 5000
const _INFORMLY_TIMEOUT_HIDE_INFO_DELAY = 2000

//DEFINE TIMEOUTS
var _INFORMLY_CHATGPT_TIMEOUT
var _INFORMLY_HIDE_INFO_TIMEOUT


var sent = false

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

async function buildInformlyInfo(content){
    // Load the template
    const template_data = await fetch(_INFORMLY_INFO_TEMPLATE_URL)
    const template_html = await template_data.text()

    // Inject the content into the template
    const injected_template_html = template_html.replace("{#TOKEN#}", content)

    var temp = document.createElement('template')
    temp.innerHTML = injected_template_html

    return temp.content
}

/**
 * Determines if target is the reddit comment box.
 * @param {*} target possible reddit comment box element
 */
function _informly_isRedditCommentBox(target){
    // TODO
    return true
}

//v1 completions wrapper
function completionWrapperV1(content){
    let prompt = _INFORMLY_PROMPT_HEADER + content
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

function extractChatGPTResponse(response){
    return response.choices[0].message.content
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
// Example POST method implementation:
async function postData(url = "", data = {}) {
    console.log("Sending request: ", data)
    try{
        // Default options are marked with *
        const response = await fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.,
        headers: {
        "Content-Type": "application/json",
        "OpenAI-Organization": "org-qRCRUPAKr7f9yoyNSQMZz1VG",
        "Authorization": "Bearer " + _INFORMLY_OPENAI_API_KEY
        },
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        });
        
        return response.json(); // parses JSON response into native JavaScript objects
    }catch(e){
        console.error(e)
    }
    
  }

function sendToChatGPT(content){
    var response = postData(_INFORMLY_OPENAI_COMPLETIONS_BASE_URL, completionWrapperV1(content))
    console.log(response)
    sent = true
    return response
}

// https://stackoverflow.com/questions/3813294/how-to-get-element-by-innertext
function fetchElementWithText(text){
    //On reddit.com this is a span.
    var xpath = "//span[text()='"+text+"']"
    console.log("xpath: ",xpath)
    var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue
    return result
}

async function triggerCheck(target){
    const originalText = target.textContent
//    chatGPTResponse = await sendToChatGPT(target.textContent)
//    chatGPTResponse = extractChatGPTResponse(chatGPTResponse)
    chatGPTResponse = 'contains misinformation'

    console.log("bot said:", chatGPTResponse)

    if(chatGPTResponse.includes("contains misinformation")){
        commentElement = fetchElementWithText(originalText)
        commentElement.innerHTML = "<span onmouseover='document.dispatchEvent(new CustomEvent(\"informly-show\"))' style='background-color: yellow; text-decoration-line: underline; text-decoration-color: red; text-decoration-style: wavy'>"+originalText+"</span>"
        console.log("UPDATED HTML")

        const fragment = await buildInformlyInfo(chatGPTResponse)
        commentElement.parentElement.appendChild(fragment)

    }
}

console.log('Informly loaded!')

document.addEventListener('informly-hide', (event)=>{
    console.log("informly HIDE!", event)

    if(_INFORMLY_HIDE_INFO_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_HIDE_INFO_TIMEOUT)
    }

    _INFORMLY_HIDE_INFO_TIMEOUT = setTimeout(()=>{
        hideInformlyInfo()
    }, _INFORMLY_TIMEOUT_HIDE_INFO_DELAY)

})

// Register listener for 'informly-show', triggered when a user hovers over higlighted misinformation.
document.addEventListener('informly-show', (event)=>{

    //Reset hide timeout if the mouse is over the text again.
    if(_INFORMLY_HIDE_INFO_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_HIDE_INFO_TIMEOUT)
    }

    console.log("informly SHOW!", event)
    showInformlyInfo()
})

//Detect typing in a textbox.
document.addEventListener('keyup', (event)=>{
    console.log('event.target: ', event.target, 'key', event.key, ' text content: ', event.target.textContent)
    
    // If more typing occurs, clear the timeout if it has been defined.
    if (_INFORMLY_CHATGPT_TIMEOUT !== undefined){
        clearTimeout(_INFORMLY_CHATGPT_TIMEOUT)
    }

    //If we haven't sent this comment before, set a time out to do so.
    if(!sent){
        // set a timeout to send the comment to chat gpt after a preset delay
        _INFORMLY_CHATGPT_TIMEOUT = setTimeout(()=>triggerCheck(event.target), _INFORMLY_TIMEOUT_DELAY)
    }
})
