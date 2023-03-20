![Informly Icon](informly_icon.png) 
<a href="https://github.com/aianta/Informly/raw/main/xpi/informly-0.1.xpi" type="application/x-xpinstall" download>Quick Install v0.1 XPI</a>
[ Quick Install v0.1 XPI](https://github.com/aianta/Informly/raw/main/xpi/informly-0.1.xpi) 

In Firefox click Extensions -> Manage Extensions -> Gear Icon -> Install Add-on From File.. then choose the XPI file above. 

For manual installation see [Installation](#installation)

>The symbol ⊤ is a value that is always true. The symbol ⊥ is a value that is always false.

A [2023 Canadian #AI Misinformation Hackathon](https://socialmedialab.ca/events/hackathon/) entry.

# Quick Links
* [Installation](#installation)
* [Implementation](#implementation-details)
* [Evaluation & More](#evaluation-opportunities-and-more)

# Informly - High level Overview
A Grammarly for misinformation. Using the misinformation interventions specified  [here](https://interventionstoolbox.mpib-berlin.mpg.de/table_concept.html), Informly targets:
* Debunking
* Friction
* Social Norms

And to a lesser extent:
* Warning and fact-checking labels.

>Note: Informly is a Firefox extension aiming to provide a bite-sized 'proof-of-concept' for what is otherwise a much grander vision for a platform for misinformation research, monitoring, and prevention. Some features are more illustrative of what could be rather than what is currently implemented.

Informly scans user comments as they're being typed for submission on social media sites (for the prototype, we focus on [Reddit](https://www.reddit.com) as our experimental platform), and highlights potential misinformation in the comment box before it is posted. In this way, misinformation may be tackled *before* it needs to be counteracted down the road. 

![Surface forms being highlighted in comment content as misinfo is detected](/img/surface-form-highlight.png)

Comment content is scanned by chatGPT for misinformation. If misinformation is detected, the corresponding content is lightly highlighted. Upon hovering over the highlighted region, Informly displays the full output from chatGPT, giving the user additional details on the detected misinformation. 

![ChatGPT explains the misinformation it detected](/img/informly-box-surface-form-highlighting-hover-no-submit.png)

This provides an opportunity for **social norms** and **debunking** interventions to take place. Informly further applies **friction** by prompting the user to provide a source for their claim, or indicate that they believe their claim was marked as misinformation inappropriately. However, the user is in no way obligated to engage, nor prevented from posting their comment regardless.

The user can dismiss the Informly box at any time by clicking the close icon in the top right corner. Doing so will leave the underlying text highlighted, allowing the user to return to the box later if they so desire. 

However if the user enters a source url, or checks the false positive checkbox, the Informly box extends to display a submit button. 

![Informly allows users to submit a url source for their claims or mark them as false positives](/img/informly-show-submit.png)

Upon clicking submit, users are thanked for engaging with the extension and credited a number of 'bytes'. These bytes are our attempt to highlight the opportunity for gamification. Currently, we calculate the number of bytes to credit for an interaction on the basis of the number of bytes in the string sent to chatGPT for checking, let's call this number *X*. Users receive X bytes when a snippet of their comment is successfully scanned by chatGPT and classified by Informly. These bytes are credited in the background regardless of whether misinformation was detected or not. When a user actively interacts with the Informly box and submits either a source or a false positive report, they are credited X bytes again for the same snippet. This accounts for the user validating chatGPTs output and further incentivizes engagement. 

At any point in time, users can check a running tally of their bytes by clicking the Informly icon on their toolbar. 

![Informly displays total number of bytes earned in the extension popup](/img/informly-stats.png)

From the same popup, users are able to download their personal dataset. This is a collection of the comment snippets which Informly deemed relevant for misinformation checking. It includes both snippets that were classified as misinformation and those that were not. User provided data as well as several other pieces of information are included as part of this dataset.

```json

{
            "originalText": "It's remarkable how many people are happy to believe NASA and other government agencies regarding the curvature of the earth. I find it very suspect that they are the sole source of evidence for their claims.",
            "id": "4ad1b39d-0c44-4233-bc7e-2fc3f41993e4",
            "timestamp": 1679279010507,
            "isMisinfo": true,
            "byUserIsMisinfo": false,
            "originUrl": "https://www.reddit.com/r/flatearth/comments/11vopwx/reafraction/",
            "byUserSourceUrl": "https://wiki.tfes.org/The_Flat_Earth_Wiki",
            "isRelevant": true,
            "textToCheck": "It's remarkable how many people are happy to believe NASA and other government agencies regarding the curvature of the earth. I find it very suspect that they are the sole source of evidence for their claims.",
            "chatGPTResponse": "Yes, this text contains misinformation. NASA and other government agencies are not the sole source of evidence for the curvature of the earth. The curvature of the earth has been observed and measured by countless individuals and organizations, including amateur astronomers, pilots, and even sailors. Additionally, there is a wealth of scientific evidence supporting the fact that the earth is round, including satellite imagery, GPS technology, and the behavior of celestial bodies.",
            "geographicRegion": "na",
            "bytes": 208,
            "snippet": {
                "misinfoId": "4ad1b39d-0c44-4233-bc7e-2fc3f41993e4",
                "text": "It's remarkable how many people are happy to believe NASA and other government agencies regarding the curvature of the earth. I find it very suspect that they are the sole source of evidence for their claims.",
                "index": 0,
                "submitted": false,
                "sentences": ["It's remarkable how many people are happy to believe NASA and other government agencies regarding the curvature of the earth", " I find it very suspect that they are the sole source of evidence for their claims", ""],
                "surfaceForms": ["remarkable", "NASA", "curvature"]
            },
            "redditTitle": "REAFRACTION",
            "subreddit": "flatearth",
            "gptSurfaceForms": ["NASA", "curvature", "curvature", "satellite imagery", "GPS"]
        }
```

# Installation 

## Requirements

* Firefox - Developed and tested on Firefox Developer edition v112.0b3 -> [Get it here](https://www.mozilla.org/en-US/firefox/112.0beta/releasenotes/).
* An OpenAI API Key with access to the `gpt-3.5-turbo-0301` model.
* (Probably Optional) An OpenAI Organization.

## Instructions

### Quick Install
[ Quick Install v0.1](https://github.com/aianta/Informly/raw/main/xpi/informly-0.1.xpi)

In Firefox click Extensions -> Manage Extensions -> Gear Icon -> Install Add-on From File.. then choose the XPI file above. 

**If Informly doesn't kick in right away, once you're on a thread with a comment box available, refresh the page and try entering some content again.**

>NOTE: Informly works best in reddit's Markdown comment editor. If using the default/'fancy' editor we recommend only typing on the first line/not hitting enter to introduce paragraph breaks. 

### Manual Instal

1. Clone this repository to your machine.
2. Open firefox and navigate to `about:debugging` through your url bar.
3. Choose `This Firefox` from the sidebar on the left hand side, you should be taken to a screen that looks like this:
![about debugging screen in firefox developer edition](/img/about-debugging-this-firefox.png)
4. Click `Load Temporary Addon...` and navigate to the cloned repository on your machine. 
5. Choose any file in the repository and click open. Informly should then load in. 
![Informly loaded in once a file from the cloned repo is chosen](/img/infromly-loaded.png)
6. With Informly loaded, right-click the Informly icon that should appear on your toolbar and choose `Manage Extension`.

![Manage the informly extension](/img/manage-extension.png)

It is possible that, depending on your browser settings the icon may not appear. In this case, you may find informly under the extensions button on your toolbar. Click the gear icon beside Informly and select `Manage Extension`.

![Extensions menu in firefox where informly may be found if it is not automatically on your toolbar](/img/alt-manage-extension.png)

This will bring you to the Addon details screen. 

![Informly details screen](/img/manage-details.png)

7. Click `Options` from the tabs on the details screen, and fill in the `OpenAI API Key` and `OpenAI Org` fields, and click `Save`.

![Informly options screen](/img/options.png)

This should complete Informly installation. Head over to http://www.reddit.com and find an interesting thread. 

**If Informly doesn't kick in right away, once you're on a thread with a comment box available, refresh the page and try entering some content again.**

>NOTE: Informly works best in reddit's Markdown comment editor. If using the default/'fancy' editor we recommend only typing on the first line/not hitting enter to introduce paragraph breaks. 

# Implementation details

The highlevel idea of Informly: 'to highlight misinformation *before* it gets posted' can have some unpleasant 'panpoticon-esque' implications. We believe it's important to tread with caution in this direction. Part of the motivation behind Informly was to attempt to demonstrate value to users in the process of slowing down misinformation. That is, the individual should benefit from Informly's usage.

We see the following incentives for Informly users:
* Spreading misinformation inadvertently can happen to anyone. Having a 'judgement-free' (though openAI's tone can certainly leave something to be desired here) AI edit tool help catch misinformation before it is spread can be valuable.
* The opportunity for passionate users to contribute towards misinformation research in a similar way that [FoldIt](https://fold.it/), [Folding@Home](https://foldingathome.org), or [Bionic](https://seti.berkeley.edu/participate/) users contribute their time, or computational resources to those projects.
* The opportunity to learn extra things about the subjects you engage with online.

Additionally, we believe Informly has the opportunity to scale well in a crowd-sourced deployment since it makes use of a very familiar 'spellcheck' user experience. A major chunk of the development time for this prototype was spent thinking about how to make the experience as seamless as possible. Our efforts to this end are detailed in this section. 

A final note before diving into deeper implementation details: It is unclear if an extension is the best form for an Informly-like solution. The extension model comes with several advantages, notably, ease of distribution and scaling to interested parties. Effort could be invested in supporting and maintaining compatibility with multiple popular social media applications. However, the extension model also comes with challenges, some of which will be discussed below. These challenges may be circumvented if an Informly-like system would be implemented by social media application owners as part of their content submission interfaces. 

## The main processing pipeline
In an attempt to create an extensible/modifiable design for Informly, we chose to use a configurable pipeline approach. That is, the bulk of Informly is implemented as an eventhandler to changes detected in textboxes on the screen.

```javascript
// Code pruned for clarity.
function handleTextboxInput(event, options, ctx){

    // Only do something if text is being entered into a textbox that is an informly target.
    if (logic.isInformlyTarget(event, ctx)){

        _INFORMLY_CHATGPT_TIMEOUT = setTimeout( 
            ()=>createMisinfoRecord(event.target.textContent, event, options) //Defines the data structure that is passed through the pipeline
                .then(result=>updateGhostboxBefore(result, event, ctx)) // UI/Ghostbox logic 
                .then(result=>logic.firstPassValidation(result, options, ctx)) // Cancel the pipeline for trivial input
                .then(result=>logic.preProcessInput(result, options)) // Create additional artifacts 
                .then(result=>logic.isRelevant(result)) // Determine if the detected input makes sense to fact check in the first place
                .then(result=>result.isRelevant?logic.chatGPTCheck(result, options, ctx): Promise.reject("Text was not relevant")) // Fact-check with chatGPT
                .then(result=>result.chatGPTResponse?logic.chatGPTResponseClassifier(result):Promise.reject('No chatgpt response')) // Try to determine if chatGPT thought the input contained misinformation
                .then(result=>persist(result, options)) // Build dataset
                .then(result=>result.isMisinfo?injectInformlyInfo(result, event):Promise.reject('No misinfo')) // Inject informly box into DOM if misinformation was detected
                .then(result=>logic.highlightText(result, event)) // Identify portion of input text to highlight
                .then(result=>updateGhostboxAfter(result, event, ctx)) // UI/Ghostbox logic (actual visual highlighting performed)
                .catch(reason=>console.log(reason)) // Log cancellation reason
            , options._input_timeout)
    }
}
```

>NOTE: We felt the best user experience was no user experience, that is, we didn't want to bother the user if what they were writing weren't claims. And if they were claims, we didn't want to bother the user if the claims were not misinformation. We continue to reward users for negative (non-misinformation) samples by incrementing bytes in the background, but otherwisen, we don't display anything. 

With the nature of a hackathon, many stages of the pipeline achieve their goals to varying degrees of success or quality. Sadly, due to the dependent nature of pipeline segments on their predecessors, low-quality results can, in some cases, cascade. For example, if our relevance check logic emits many false positives, we're bound to bother the user more than necessary and use more compute resources than necessary. Nevertheless, this design approach gives one a sort of logical map of the extension to which modular and incremental improvements can be made.  

```javascript
/**
 * ASSEMBLE EXTENSION LOGIC HERE
*/
let logic = {
    isInformlyTarget: checkTargetRecursively,
    firstPassValidation: firstPassValidationV1,
    preProcessInput: dbpediaSpotlightPreProcess,
    isRelevant: relevanceCheckV1,
    chatGPTCheck: chatGPTCheck,
    chatGPTResponseClassifier: classifierV1,
    highlightText: surfaceFormHighlight,
}
```
As we felt some sections of the pipeline were especially 'swapable', we implemented a logic object that allows one to easily change the behavior at those sections. Care must still be taken to ensure inputs to each section are satisfied. However, this design choice came in very handy. During development/debugging the UI, we'd often swap expensive API call implementations for dummy implementations. 

## The Ghostbox Approach 
One major challenge for the extension approach was the fact that modern social media applications like Reddit use reactive front end frameworks like [React](https://react.dev/) to implement their UIs. Simple HTML input fields or textareas aren't as common, and modifying the contents of these textboxes runs the risk of breaking application behavior. 

Our initial thought, to simply wrap text we'd like to highlight in `<span></span>` elements with appropriate styling and `onmousehover` events was therefore a no-go. 

### Ghostboxes
To refrain from editing the content of a textbox while still delivering our functionality, we opted to create a hidden 'ghost' textbox with the exact same style and position as the one the user was typing in. This 'ghostbox' would stay underneath the page via `z-index` and 'haunt' the textbox on the layers above. 

We recreate the content of the commentbox in the ghostbox and create '<span></span>'s for sections we want to highlight. Though ghostbox spans don't bother with coloring, since they're 'underneath' the rest of the page, they're never seen by the user. Their focus is on maintaining their position with the corresponding elements in the commentbox above.

Once the `<span></span>`'s are created, we create `Highlight` objects for each span. Each `Highlight` object, in turn, has one or more `Zones`.

```javascript
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
        this.hauntee = hauntee
        this.... set a bunch of instance variables

        //Create the ghostbox
        let template = document.createElement('template')
        template.innerHTML = '<div id="'+this.id+'"></div>' //TODO - better ;)
        document.documentElement.appendChild(template.content)

        // Define highlights 
        this.highlights = []

        // Define snippets
        this.snippets = []

        // Define spans
        this.spans = []

        // Plain string containing full text in the box
        this.fullText = ''
    }
```

`Highlight`'s are organizational objects that have a 1-to-1 relationship with a section of text to be highlighted (a ghostbox `<span></span>`). However they are insufficient by themselves. `Zone`'s are required because spans can, well, span multiple lines, in which case multiple rectangles are required to highlight the whole text. 

![3 zone highlight](/img/3-zone-highlight.png)

In the above example, 3 zones (rectangles) have to be drawn to cover the 'single' highlight. Zones are the actual visual element that you see on top of the text. They are just `divs` with a high `z-index`, a `0.5` opacity, and the highlight color. 

The ghostbox and the zones are positioned absolutely onto the screen, with the former pinned against the boundingClientRectangle of the comment box, and the latter pinned against the corresponding span's `clientRects`.

As the user scrolls, we update the zones and ghostbox's position to keep everything where it's supposed to be.

### The Snippet System

The snippet system is our attempt at partitioning text as the user types for live feedback. It allows us to consider only parts of a comment we haven't yet processed. As a snippet is typed, we check that it is long enough, and relevant for misinformation checking. If so, we process it and create spans/highlights/zones as necessary. 

Below is a GIF of the snippet system in action; no actual relevance checking or misinformation checking is happening here. Informly is also set to process input after 1 second from the last update. The best user experience is achieved when the delay before scan is a good bit longer than that (try 2-5 seconds in the options), however it's easier to see the snippet system in action with a lower delay.

![Snippet system gif](/img/informly.gif)

### Final Comments on UI work

Though it's painful, there is a lot of complexity involved in delivering a truly seamless user experience for Informly while never touching the overlying (Reddit) application, nor inadvertently bothering the user. 

The ghostboxes and the snippet system were, in retrospect, quite ambitious systems to try and implement. Sadly, there are many cases where they will choke, sometimes because Reddit's react events have modified elements in unexpected ways, other times just on account of plain old bugs. Nevertheless it was rewarding to piece them together and we hope they're stable enough to work at least a few times on your machine as well.

## Relevance, DBpedia Spotlight and Surface Forms
As mentioned previously, we'd like to avoid bothering the user unnecessarily, and as you can see from the previous section, when one highlights a lot, one virtually highlights nothing. 

To better achieve these goals we make use of the free and publically available [DBPedia Spotlight](https://www.dbpedia-spotlight.org/api) api. It provides us with a wikipedia backed entity recognition service. We make the assumption that, for there to be misinformation in a snippet, we should get at least one entity match. The portion of the text that matched a DBpedia entity, is called a 'surface form'. 

In terms of relevance, this is a pretty simplistic test. A more advanced approach might attempt to leverage something like Stanford CoreNLP and try to piece together a dependency graph of the snippet, making sure that there is at least some relation between a verb and a subject/object surface form. 

Nevertheless, by performing surface form analysis on chatGPT and focusing out highlights on terms that appear as surface forms for both the user's snippet *and* chatGPT's response, we were able to highlight a lot less, in a way that still made sense.  

## ChatGPT Prompt Engineering
We took a much more relaxed approach towards this portion of the solution. Especially once we were driven mildly insane by ghostboxes and snippets. 

While we acknowledge that preventing prompt injection, and adding all the disclaimers around the effectiveness/relevance/bias/appropriateness of chatGPT responses is critical to any real world application of the technology, we felt anyone evaluating our work or attempting to build off it, was likely familiar enough with the technology to know what to expect. 


For reference the format of our chatGPT requests is shown below. 

```javascript
{
        "model": "gpt-3.5-turbo-0301",
        "messages": [
            {"role": "system", "content": `You are fact checking comments on a reddit post with the title '${redditTitle}' that was posted on the '${subreddit}' subreddit. `},
            {"role": "user", "content": `Does the following text contain misinformation?  '${sampleText}'`}
        ],
        "temperature": 0,
        "n": 1,
        "max_tokens": 200,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
}
```



# Evaluation, Opportunities, and more...
Admittedly, very limited time was left for evaluation. Throughout development, the main user flow was invoked in many different ways to attempt to provide a good demo experience.

However, thought was given to the kind of scientific evaluation an Informly-like system could facilitate. Notably, we feel there is opportunity for a misinformation dataset generation. A non-exhaustive list of uses for such a dataset include:

* Evaluating the performance of chatGPT models in identifying misinformation correctly. 
    * The Informly addon could be distributed to trusted researchers who can act as 'sources of truth' accurately marking false positives.
* Monitoring the spread of misinformation across geographic regions.
    * While the prototype implements very coarse-grained 'continent' level information as an example this could be expanded upon.
* Determining common topics/subjects for misinformation by aggregating surface forms. 
* Creating embeddings for pieces of misinformation and using positive and negative examples. 
    * These embeddings could then be used for zero-shot classification of ChatGPT responses, replacing the 'dumb' classifier in Informly.
* Studying the efficacy of Informly at preventing or slowing the spread of misinformation. 
    * Consenting/interested/qualified participants could be onboarded into double-blind randomized control studies where some extension instances don't do anything at all, while others perform their normal functions. The number of times users end up actually submitting misinformation could be aggregated. 
