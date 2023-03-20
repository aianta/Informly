![Informly Icon](informly_icon.png) 

>The symbol ⊤ is a value that is always true. The symbol ⊥ is value that is always false.

A [2023 Canadian #AI Misinformation Hackathon](https://socialmedialab.ca/events/hackathon/) entry.

# Informly - High level Overview
A grammarly for misinformation. From the misinformation interventions  [here](https://interventionstoolbox.mpib-berlin.mpg.de/table_concept.html), Informly targets:
* Debunking
* Friction
* Self-reflection tools

And to a lesser extent:
* Social Norms
* Warning and fact-checking labels.

>Note: Informly is an firefox extension aiming to provide a bite-sized 'proof-of-concept' for what is otherwise a much grander vision for a platform for misinformation research, monitoring and prevention. Some features are more illustrative of what could be rather than what is currently implemented.

Informly scans user comments as they're being typed for submission on social media sites (for the prototype we focus on [Reddit](https://www.reddit.com)), and highlights potential misinformation in the comment box before it is posted. In this way, misinformation may be stopped *before* it needs to be counteracted down the road. 

![Surface forms being highlighted in comment content as misinfo is detected](/img/surface-form-highlight.png)

Comment content is scanned by chatGPT for misinformation, if misinformation is detected, the corresponding content is lightly highlighted. Upon hovering over the highlighted region, Informly displays the full output from chatGPT, giving the user additional details on the detection. 

![ChatGPT explains the misinformation it detected](/img/informly-box-surface-form-highlighting-hover-no-submit.png)

This gives an opportunity for **self-reflection** and **debunking** to take place. Informly further applies **friction** by prompting the user to provide a source for their claim, or indicate that they believe their claim was marked as misinformation inappropriately. However, the user is in no way obligated to engage, nor in any way prevented from posting their comment regardless.

The user can dismiss the informly box at any time by clicking the close icon in the top right corner. Doing so will leave the underlying text highlighted, allowing the user to return to the box later if they so desire. 

However if the user enters a source url, or checks the false positive checkbox, the informly box extends to display a submit button. 

![Informly allows users to submit a url source for their claims or mark them as false positives](/img/informly-show-submit.png)

Upon clicking submit, users are thanked for engaging with the extension, and credited a number of 'btyes'. These bytes are our attempt to highlight the opportunity for gamification. Currently we calculate the number of bytes to credit for a interaction on the basis of the number of bytes in the string sent to chatGPT for checking, let's call this number *X*. Users recieve X bytes when a snippet of their comment is successfully scanned by chatGPT and classified by Informly. These bytes are credited in the background regardless of whether misinformation was detected or not. When a user actively interacts with the informly box and submits either a source or a false positive report they are credited X bytes again for the same snippet. This accounts for the user validating chatGPTs output, and further incentivises engagement. 

At any point in time, users can check a running tally of their bytes by clicking the Informly icon on their toolbar. 

![Informly displays total number of bytes earned in the extension popup](/img/informly-stats.png)

From the same popup users are able to download their personal dataset. This is a collection of the comment snippets which Informly deemed relevant for misinformation checking. It includes both snippets that were classified as misinformation and those that were not. User provided data as well a several other pieces of information are included as part of this dataset.

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

This should complete Informly installation, head over to http://www.reddit.com and find an interesting thread. 

>NOTE: Informly works best in reddit's Markdown comment editor. If using the default/'fancy' editor we reccomend only typing on the first line/not hitting enter to introduce paragraph breaks. 

# Functionality

## Implemented

## Future Work

# How it helps fight misinformation

# Evaluation
