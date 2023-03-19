
// Define an option map of storage keys with their corresponding html input ids.
const optionMap = new Map()
optionMap.set('_openai_key', 'openai-key')
optionMap.set('_openai_url','openai-url')
optionMap.set("_openai_org", 'openai-org')
optionMap.set('_input_timeout', 'input-timeout')
optionMap.set('_fade_timeout', 'fade-timeout')
optionMap.set('_min_snippet_length', 'min-snippet-length')
optionMap.set('_min_sentences', 'min-sentences')
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
    browser.storage.sync.get(storageKey).then((res)=>document.querySelector("#" + optionId).value = res[storageKey]?res[storageKey]:_informly_defaultMap.get(storageKey))
}

function restoreOptions(){
    for ([storageKey,htmlId] of optionMap){
        load(storageKey, htmlId)
    }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions)