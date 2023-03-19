console.log('helloo from popup')
function getStats(){
    console.log('getstats')
    browser.storage.local.get('user').then(
        result=>{
            console.log('got', result)
            if (result === undefined || isEmptyObject(result)){
                document.getElementById('bytes-value').textContent = 0
            }else{
                document.getElementById('bytes-value').textContent = result.user.bytes
            }            
        }
    )
}

function download(){
    
    browser.storage.local.get('dataset')
        .then(result=>{
            if (result === undefined || isEmptyObject(result)){
                //TODO some sort of UI hint about this
                alert("No data to download!")
                return Promise.reject("No data to download")
            }

            const _data = new Blob([JSON.stringify(result)])
            const _data_url = URL.createObjectURL(_data)
            browser.downloads.download({url: _data_url, filename: 'informly_dump.json'})
            console.log('Data downloaded!')
        })
}

document.getElementById('download').addEventListener('click', (event)=>download())

document.addEventListener('download-data', download)
document.addEventListener('DOMContentLoaded', getStats)

//UTILITY FUNCTIONS
//https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
function isEmptyObject(obj){
    return obj // 👈 null and undefined check
        && Object.keys(obj).length === 0
        && Object.getPrototypeOf(obj) === Object.prototype
}