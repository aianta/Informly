console.log("Options.js says hi!")

// Define an option map of default values to use in case of undefined.
const defaultMap = new Map()
defaultMap.set('_openai_key', '')
defaultMap.set('_openai_url','https://api.openai.com/v1/chat/completions')
defaultMap.set('_prompt_prefix', 'Does the following comment contain misinformation: ')
defaultMap.set('_input_timeout', 5000)
defaultMap.set('_fade_timeout', 2000)
defaultMap.set('_allow_negative_samples', true) //TODO: change to false
defaultMap.set('_allow_positive_samples', true) //TODO: change to false
defaultMap.set('_geographic_region', 'na')

// Define an option map of storage keys with their corresponding html input ids.
const optionMap = new Map()
optionMap.set('_openai_key', 'openai-key')
optionMap.set('_openai_url','openai-url')
optionMap.set('_prompt_prefix', 'prompt-prefix')
optionMap.set('_input_timeout', 'input-timeout')
optionMap.set('_fade_timeout', 'fade-timeout')
optionMap.set('_allow_negative_samples', 'allow-negative-samples')
optionMap.set('_allow_positive_samples', 'allow-positive-samples')
optionMap.set('_geographic_region', 'geographic')


function saveOptions(e){

    console.log("Saving...")

    let optionsData = {}

    for (let [storageKey, htmlId] of optionMap){
        let optValue = document.querySelector("#"+htmlId).value

        if (optValue === 'true'){
            optValue = true
        }

        if (optValue === 'false'){
            optValue = false
        }
        optionsData[storageKey] = optValue
    }

    browser.storage.sync.set(optionsData)

    e.preventDefault();
}

function load (storageKey, optionId){
    browser.storage.sync.get(storageKey).then((res)=>document.querySelector("#" + optionId).value = res[storageKey]?res[storageKey]:defaultMap.get(storageKey))
}

function restoreOptions(){
    for ([storageKey,htmlId] of optionMap){
        load(storageKey, htmlId)
    }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions)