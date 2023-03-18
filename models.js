
class Snippet{
    constructor(misinfoId, text, index){
        this.misinfoId = misinfoId 
        this.text = text
        this.index = index
        this.highlight = undefined
    }


}

class Zone{
    constructor(misinfoId, index, x, y, width, height){
        this.misinfoId = misinfoId
        this.id = misinfoId + '-' + index
        this.x = x
        this.y = y
        this.width = width
        this.height = height

        let template = document.createElement('template')
        template.innerHTML = "<div informly-type=\"zone\" misinfo-id=\""+misinfoId+"\" zone-id=\""+this.id+"\"></div>"
        document.documentElement.appendChild(template.content)

        this.element = $('[zone-id="'+this.id+'"]')[0]
    }

    show(){
        this.element.style.display = 'block'
        this.element.style.backgroundColor = 'yellow'
        this.element.style.opacity = 0.5
        this.element.style.width = this.width + "px"
        this.element.style.height = this.height + "px"
        this.element.style['z-index'] = 1000
        this.element.style.position = 'absolute'
        this.element.style.top = this.y + 'px'
        this.element.style.left = this.x + 'px'
        // this.element.style['pointer-events'] = 'none'
        this.element.onmouseover = ()=>{
            //Show informly 
            document.dispatchEvent(new CustomEvent('informly-show', {detail:{
                misinfoId: this.misinfoId,
                zoneId: this.id
            }}))
            //And get out of the way
            this.element.style['pointer-events'] = 'none'
            console.log('fired from function injected by Zone!')
        }
            
    }
}

class Highlight{
    constructor(span){
        this.misinfoId = span.getAttribute('misinfo-id')
        this.span = span
        this.zones = []

        //Create highlight zones for each client rectangle in the span.
        for (let rect of this.span.getClientRects()){
            this.createZone(rect.x, rect.y, rect.width, rect.height)
        }

        //Show zones
        this.zones.forEach(zone=>zone.show())
    }

    destroy(){
        this.zones.forEach(zone=>zone.element.remove())
    }

    createZone(x,y,width, height){
        this.zones.push(new Zone(this.misinfoId, this.zones.length, x,y,width, height))
    }

}

class GhostBox{
    /**
     * 
     * @param {*} x x position to mimc
     * @param {*} y y position to mimic
     * @param {*} width width to mimic
     * @param {*} height height to mimic
     * @param {*} font font to mimic
     * @param {*} pt padding top to mimic
     * @param {*} pb padding bottom to mimic
     * @param {*} pl padding left to mimic
     * @param {*} pr padding right to mimic
     */
    constructor( x, y, width, height, font, pt, pb, pl, pr){
        this.id = uuidv4() //Ghostbox id
        this.width = width
        this.height = height
        this.x = x
        this.y = y

        //Save parsed numerical values
        this.pt = parsePadding(pt)
        this.pb = parsePadding(pb)
        this.pl = parsePadding(pl)
        this.pr = parsePadding(pr)

        //Create the ghostbox
        let template = document.createElement('template')
        template.innerHTML = '<div id="'+this.id+'"></div>'
        
        document.documentElement.appendChild(template.content)

        // https://stackoverflow.com/questions/4069982/document-getelementbyid-vs-jquery
        this.textbox = $('#' + this.id)[0]
        this.textbox.style['max-width'] = width + "px"
        this.textbox.style['min-width'] = width + "px"
        this.textbox.style['max-height'] = height + "px"
        this.textbox.style['min-height'] = height + "px"
        this.textbox.style['background-color'] = '#ADD8E6'
        this.textbox.style['overflow-wrap'] = 'break-word'
        this.textbox.style['word-wrap'] = 'break-word'
        this.textbox.style['overflow'] = 'hidden'

        //TODO: make these update-able?
        this.textbox.style['font'] = font
        this.textbox.style['padding-top'] = pt 
        this.textbox.style['padding-bottom'] = pb
        this.textbox.style['padding-left'] = pl
        this.textbox.style['padding-right'] = pr

        // Define highlights 
        this.highlights = []

        // Define snippets
        this.snippets = []

        // Define spans
        this.spans = []

        // Plain string containing full text in the box
        this.fullText = ''
    }

    setPosition(x,y,width,height){
        this.x = x
        this.y = y
        this.width = width
        this.height = height
    }

    setX(x){
        this.x = x;
    }

    setY(y){
        this.y = y
    }

    setHeight(height){
        this.height = height
    }

    setWidth(width){
        this.width = width
    }


    resetZoneById(zoneId){
        this.highlights
            .filter(h=>h.zones.filter(z=>z.id === zoneId).length > 0)
            [0]
            .zones.find(z=>z.id === zoneId).element.style['pointer-events'] = 'auto' 
    }

    /**
     * Place the ghostbox underneath the real one at x,y
     */
    place(){
        this.textbox.style.position = 'absolute'
        this.textbox.style.display = 'block'
        this.textbox.style.top = this.y + 'px'
        this.textbox.style.left = this.x + 'px'
        this.textbox.style['max-width'] = (this.width - (this.pl + this.pr)) + "px"
        this.textbox.style['min-width'] = (this.width - (this.pl + this.pr)) + "px"
        this.textbox.style['max-height'] = (this.height - (this.pt + this.pb)) + "px"
        this.textbox.style['min-height'] = (this.height - (this.pt + this.pb)) + "px"
        //this.textbox.style['z-index'] = 1000// TODO remove
        this.textbox.style.opacity = 0.25 // TODO remove
    }



    makeSpan(snippet, highlightedText){
        // Sanity check, highlighted text should always be subset of snippet text
        if(!snippet.text.includes(highlightedText)){    
            console.error("Highlighted text: ", highlightedText, " not part of snippet! ", snippet)
        }
        //Make HTML for span for this highlight
        let spanHTML = "<span misinfo-id='"+snippet.misinfoId+
        "' contenteditable=\"true\" onmouseover='document.dispatchEvent(new CustomEvent(\"informly-show\", "+snippet.misinfoId+
        "))' >"+highlightedText+"</span>"
        return spanHTML
    }

    updateContent(){
        
        let resultHTML = ''

        this.snippets.reverse().forEach(snippet=>{
            // No highlights in this snippet
            if (snippet.highlight === undefined){
                //Simply append the snippet text. 
                resultHTML += snippet.text
            }else{
                //Figure out what preceds the highlighted text.
                let preHighlightText = snippet.text.substring(0,snippet.text.indexOf(snippet.highlight))
                //Figure out what follows the highlighted text.
                let postHighlightText = snippet.text.substring(snippet.text.indexOf(snippet.highlight) + snippet.highlight.length, snippet.text.length)

                resultHTML += preHighlightText +
                    this.makeSpan(snippet, snippet.highlight) +
                    postHighlightText
            }
            
        })

        // Output our HTML into the dom
        this.textbox.innerHTML = resultHTML

        // Get the spans we just made
        this.spans = this.snippets.filter(s=>s.highlight !== undefined)
            .map(s=>$('span[misinfo-id="'+s.misinfoId+'"]')[0])

        this.purgeHighlights()

        // For each span, make a highlight object.
        this.highlights = this.spans.map(span=>new Highlight(span))
    }

    purgeHighlights(){
        this.highlights.forEach(h=>h.destroy())
    }


    handleUserUpdate(newContent, record){
        this.fullText = newContent

        if (this.snippets.length === 0){
            this.snippets.unshift(
                new Snippet(record.id, this.fullText, this.snippets.length)
                )
        }else{
            //If we have previous snippets
            let alreadyScanned = ''
            let temp = []

            while(this.snippets.length > 0){
                let snippet = this.snippets.shift()
                temp.unshift(snippet)
                alreadyScanned += snippet.text

                //Check stored snippets to determine how many remain valid
                if(this.fullText.startsWith(alreadyScanned)){
                    continue
                }else{
                    //If text has been changed, this makes snippets no longer part of the text invalid

                    //get back the last successful alreadyScanned by removing the snippet that made the if condition fail.
                    alreadyScanned = alreadyScanned.substring(0, (alreadyScanned.length - snippet.text.length))
                    //undo the last unshift in temp
                    temp.shift()
                    //purge (any) other saved snippets for this textbox as we can't rely on them being valid anymore
                    //https://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript
                    this.snippets.splice(0,this.snippets.length)
                    
                    break
                    
                }
            }

            //Reset the snippets array using temp
            this.snippets = this.snippets.concat(temp)

            //Determine the new portion of the input and put it in 
            let nextSnippet = new Snippet(record.id, this.fullText.substring(alreadyScanned.length), this.snippets.length)

            console.log('New snippet', nextSnippet)

            this.snippets.unshift(nextSnippet)
        }


        return this.snippets[0]  
    }
}


// UTILS

// Shamelessly taken from:
// https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function parsePadding(value){
    return parseInt(value.substring(0,value.length-2)) //get rid of 'px' and parse number
}