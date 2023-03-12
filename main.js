

console.log('Informly loaded!')


// Loading a template from the extension files
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources
let informlyButtonTemplateUrl = browser.runtime.getURL('templates/informly_button.html')
console.log("informlyButtonHtml:", informlyButtonTemplateUrl)

let added = false

//https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
fetch(informlyButtonTemplateUrl)
    .then((response)=>response.text())
    .then((data)=>{
        console.log("loaded:", data)

        // Creating a template element from html string.
        // https://stackoverflow.com/questions/9284117/inserting-arbitrary-html-into-a-documentfragment

        var temp = document.createElement('template')
        temp.innerHTML = data
        var fragment = temp.content

        //Detect typing in a textbox.
        document.addEventListener('keyup', (event)=>{
            console.log('event.target: ', event.target, 'key', event.key, ' text content: ', event.target.textContent)
            
            if(!added){
                event.target.parentElement.appendChild(fragment)
                added = true
            }
            

        })

    
    })



