
class Snippet{
    constructor(misinfoId, text, index){
        this.misinfoId = misinfoId 
        this.text = text
        this.index = index
        this.highlight = undefined
        this.submitted = false
    }

    markSubmitted(){
        this.submitted = true
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

        this.element = $('[zone-id="'+this.id+'"][informly-type="zone"]')[0]
    }

    updatePosition(x,y){
        this.x = x
        this.y = y
        this.element.style.top = this.y + 'px'
        this.element.style.left = this.x + 'px'
    }

    /**
     * Resets the zone: Re-enables pointer-events so that it can trigger 'informly-show' events.
     */
    resetZone(){
        this.element.style['pointer-events'] = 'auto'
    }

    /**
     * A submitted zone is one that doesn't trigger any more events, and
     * uses alternative, less obrusive styling.
     */
    markSubmitted(){
        this.element.style['pointer-events'] = 'none'
        this.element.style.backgroundColor = 'transparent'
        this.element.style.border = '1px solid #CCE1AD'
        this.element.style.borderRadius = '5px'
        this.element.style.opacity = 0.7
    }

    show(){
        this.element.style.display = 'block'
        this.element.style.backgroundColor = '#fcf6c5'
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
            /** And get out of the way. We disable pointer-events so that uses can click through
             *  the highlight div and edit the text underneath. 
             * */
            this.element.style['pointer-events'] = 'none'
            console.log('fired from function injected by Zone!')
        }
            
    }

    destroy(){
        this.element.remove()
    }
}

class Highlight{
    constructor(span){
        this.misinfoId = span.getAttribute('misinfo-id')
        this.span = span
        this.zones = []

        this.createZones()
        this.showZones()
    }

    /**
     * Marks all zones for this highlight as submitted
     */
    markSubmitted(){
        this.zones.forEach(zone=>zone.markSubmitted())
    }

    resetAllZonesExcept(zoneId){
        this.zones
            .filter(zone=>zone.id !== zoneId)
        .forEach(zone=>zone.resetZone())
    }

    resetAllZones(){
        this.zones.forEach(zone=>zone.resetZone())
    }

    resetZone(zoneId){
        this.zones.find(zone=>zone.id === zoneId).resetZone()
    }

    destroy(){
        this.zones.forEach(zone=>zone.element.remove())
    }

    updateZones(){
        for (const i in this.span.getClientRects()){
            const rect = this.span.getClientRects().item(i)
            if (i < this.zones.length){
                this.zones[i].updatePosition(rect.x + window.scrollX, rect.y + window.scrollY)
            }
            
        }
    }

    createZones(){
        //Create highlight zones for each client rectangle in the span.
        for (let rect of this.span.getClientRects()){
            this.createZone(rect.x + window.scrollX, rect.y + window.scrollY, rect.width, rect.height)
        }
    }

    showZones(){
        //Show zones
        this.zones.forEach(zone=>zone.show())
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
     * @param {*} hauntee the element from the page that this ghostbox haunts
     */
    constructor( x, y, width, height, font, pt, pb, pl, pr, hauntee){
        this.id = uuidv4() //Ghostbox id
        this.width = width
        this.height = height
        this.x = x
        this.y = y
        this.hauntee = hauntee

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
        this.textbox.style['white-space'] = 'pre-wrap' //Important!

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

    markSubmitted(misinfoId){
        //Mark highlight submitted
        this.highlights.find(h=>h.misinfoId === misinfoId)
        .markSubmitted()
        //Mark snippet submitted
        this.snippets.find(s=>s.misinfoId === misinfoId).markSubmitted()
    }

    //Resets all zones except those corresponding to a highlight with misinfoId
    resetAllZonesExcept( zoneId){
        let zones = []
        this.highlights.forEach(h=>zones.push(...h.zones))
        zones.filter(zone=>zone.id !== zoneId)
            .forEach(z=>z.resetZone())
    }

    resetZoneById(zoneId){
        this.highlights
            .find(h=>h.zones.filter(z=>z.id === zoneId).length > 0)
            .resetZone(zoneId)
    }

    /**
     * Place the ghostbox underneath the real one at x,y
     */
    place(){
        
        //Account for scrolling
        const box_position = this.hauntee.getBoundingClientRect()
        this.setPosition(box_position.x + window.scrollX, box_position.y + window.scrollY, box_position.width, box_position.height)
        

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

        //Once we've placed ourselves update the highlights that depends on us
        this.highlights.forEach(h=>h.updateZones())
    }



    makeSpan(snippet, highlightedText){
        // Sanity check, highlighted text should always be subset of snippet text
        if(!snippet.text.includes(highlightedText)){    
            console.error("Highlighted text: ", highlightedText, " not part of snippet! ", snippet)
        }
        //Make HTML for span for this highlight
        let spanHTML = `<span class="informly-ghost-span" misinfo-id='${snippet.misinfoId}' onmouseover='document.dispatchEvent(new CustomEvent("informly-show", {detail:{misinfoId:"${snippet.misinfoId}"}}))'>${highlightedText}</span>`
        return spanHTML
    }

    /**
     * WARNING: only call before updateContent() probably...
     * 
     * Discards the snippet at the front of the snippet list. Used when a snippet
     * is not deemed relevant.
     */
    discardSnippet(){
        this.snippets.pop()
        this.updateContent()
    }

    updateContent(){
        
        let resultHTML = ''

        this.snippets.forEach(snippet=>{
            // No highlights in this snippet or snippet was submitted
            if (snippet.highlight === undefined || snippet.submitted === true){
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
        this.spans = this.snippets.filter(s=>s.highlight !== undefined && s.submitted === false)
            .map(s=>$('span[misinfo-id="'+s.misinfoId+'"]')[0])

        this.purgeHighlights()

        // For each span, make a highlight object.
        this.highlights = this.spans.map(span=>new Highlight(span))
    }

    purgeHighlights(){
        this.highlights.forEach(h=>h.destroy())
    }


    handleUserUpdate(newContent, record){
        console.log('before handleUserUpdate', this)
        this.fullText = newContent


        if (this.snippets.length === 0){
            this.snippets.push(
                new Snippet(record.id, this.fullText, this.snippets.length)
                )
        }else{
            console.log('managing snippets', this.snippets)
            //If we have previous snippets
            let alreadyScanned = ''
            let deleteFrom = 0
            for (let i = 0; i < this.snippets.length; i++){
                console.log('alreadyscanned: ',alreadyScanned,'i',i, 'snippet',this.snippets[i].text)
                alreadyScanned += this.snippets[i].text

                if(this.fullText.startsWith(alreadyScanned)){
                    continue
                }else{
                    alreadyScanned = alreadyScanned.substring(0, this.snippets[i-1]?this.snippets[i-1].text.length:0)
                    console.log('alreadyscanned: ',alreadyScanned)
                    deleteFrom = i
                    console.log('delete from', i)
                    this.snippets.splice(i)
                    console.log(this.snippets)
                    break
                }
            }

            console.log('new snippet text', this.fullText.substring(alreadyScanned.length))

            //Determine the new portion of the input and put it in 
            let nextSnippet = new Snippet(record.id, this.fullText.substring(alreadyScanned.length), this.snippets.length)

            console.log('New snippet', nextSnippet)

            this.snippets.push(nextSnippet)
        }

        console.log('after handleUserUpdate', this)
        return this.snippets[this.snippets.length-1]  
    }

    destroy(){
        this.highlights.forEach(h=>h.destroy())
        this.element.remove()
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