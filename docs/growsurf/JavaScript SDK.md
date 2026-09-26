# JavaScript SDK

Use the JavaScript SDK to interact with your GrowSurf program and participant data.

{% hint style="info" %}
**Using AI?** Follow [Build with AI](https://docs.growsurf.com/build-with-ai).
{% endhint %}

## Getting Started

### Step 1: Make sure the GrowSurf Universal Code is installed

Any webpage with the [GrowSurf Universal Code](/getting-started.md#step-1-install-the-growsurf-universal-code-onto-your-site) installed can use the JavaScript SDK. You can test this by entering [`growsurf.open()`](/developer-tools/javascript-sdk/api-reference.md#open-growsurf-window) in your browser's Developer Console.

The SDK acts on the program whose ID is in your GrowSurf Universal Code. [Click here for image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfU8ACBJhil-h8kFAU6%2F-LfU8CXlMq8GdEnHEwxt%2FScreen%20Shot%20on%202019-05-22%20at%2018%3A43%3A17.png?alt=media\&token=3778b13a-db9b-43d3-bce0-eef707391e8a).

{% hint style="warning" %}
**Testing in development?**

* If you are testing on a development URL (e.g., `http://localhost:3000`), you will need to whitelist that URL in the Installation step of the *Program Editor*. [Click here for image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfU8FwcsZe9b-yjChHs%2F-LfU8rnazUxtZgHvmI4x%2FScreen%20Shot%20on%202019-05-22%20at%2018%3A47%3A27.png?alt=media\&token=d82bbd8e-bff3-471d-af16-3d9edc45facb).
* We recommend creating two different programs for development and production environments. [Learn more here](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
  {% endhint %}

## **`grsfReady` Event Listener**

The GrowSurf Universal Code loads asynchronously. Therefore, if you intend to execute any `growsurf` functions on page load, you must wait until the library has completely loaded.

When loaded successfully, the GrowSurf Universal Code will dispatch a `grsfReady` event, notifying any event listeners that it is ready for use. Only then will any GrowSurf JavaScript SDK functions work.

### Example of using `grsfReady`

```javascript
// Listen and wait for the Growsurf Universal Code to initialize
window.addEventListener('grsfReady', () => {
  console.log('GrowSurf is Ready!');
  // Your code goes here...
});
```

Depending on script load order, `grsfReady` may fire before your code adds its listener. If your callback never runs, check for `window.growsurf` first:

```javascript
// Check to see if GrowSurf is available
if(!window.growsurf) {
  // Listen and wait for the Growsurf Universal Code to initialize
  window.addEventListener('grsfReady', () => {
    console.log('GrowSurf is Ready!');
    // Your code goes here...
  });
} else {
  console.log('GrowSurf is Already Available');
  // Your code goes here...
}
```

If you are executing `growsurf` functions *not* on page load, we recommend you wrap them in a conditional like this...

### Example of using a conditional

```javascript
// Check if the GrowSurf Universal Code is present
if (window.growsurf) {
    // Then, open the GrowSurf window
    growsurf.open();
}
```

## **URL Parameters**

On any webpage where you have GrowSurf installed (including the GrowSurf-hosted referral portal), you can use the `grsf_email` URL parameter to ensure that when someone lands on the page, they see their unique referral link right away instead of a signup form.

For example, when an existing participant lands on `https://grow.surf/abc123?grsf_email=bob@loblaw.com`, they can instantly access their unique referral link without needing to log in. Conversely, if it's a non-existing participant, they will be added to your program as a participant, skipping the signup process and seeing their unique link immediately.

{% hint style="info" %}
**Other tips**:

* Using `grsf_email` is also useful for adding new participants on the fly (e.g., add people only when they open your referral portal).
* Setting `grsf_first_name` and `grsf_last_name` will also set the participant's first name and last name, respectively, if the participant was newly added.
  {% endhint %}

### List of URL Parameters

| **URL Parameter** | **Description**                                                                                                                                                                                   | **Example URL**                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grsf_email`      | Set this value if you want to automatically add a new participant, or return an existing participant                                                                                              | `https://grow.surf/abc123/grsf_email=bob@loblaw.com`                                                                                                       |
| `grsf_first_name` | (Only applies if `grsf_email` is set) Set this value if you want to add a new participant with a first name                                                                                       | <p><code><https://grow.surf/abc123?grsf_email=bob@loblaw.com></code><br><code>\&grsf\_first\_name=Bob</code></p>                                           |
| `grsf_last_name`  | (Only applies if `grsf_email` is set) Set this value if you want to add a new participant with a last name                                                                                        | <p><code><https://grow.surf/abc123?grsf_email=bob@loblaw.com></code><br><code>\&grsf\_first\_name=Bob</code><br><code>\&grsf\_last\_name=Loblaw</code></p> |
| `grsf`            | (Read-Only) This value represents the referrer's unique GrowSurf ID. You never have to worry about setting this value, as it gets automatically generated in participant's unique referral links. | `https://yoursite.com?grsf=z7o8au`                                                                                                                         |

## **Next Steps**

* [View Tutorials](/developer-tools/javascript-sdk/tutorials.md)
* [View Embeddable Elements](/developer-tools/embeddable-elements.md)
* [View Single Page Applications](/developer-tools/javascript-sdk/single-page-applications.md)
* [View API Reference](/developer-tools/javascript-sdk/api-reference.md)


# Tutorials

How to implement the GrowSurf JavaScript SDK in common use-case scenarios.

Table of contents

| Scenario                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Example 1: Trigger a referral on qualifying action (e.g, on conversion, purchase or upgrade)](#example-1-trigger-a-referral-on-qualifying-action-e.g-on-conversion-purchase-or-upgrade)                          |
| [Example 2: Open the GrowSurf window on button click](#example-2-open-growsurf-window-on-button-click)                                                                                                            |
| [Example 3: Display a participant's unique share link and referral count inline on a webpage](#example-3-display-a-participants-unique-share-link-and-referral-count-inline-on-a-webpage)                         |
| [Example 4: Redirect to another URL after a successful participant signup](#example-4-redirect-to-another-url-after-a-successful-participant-signup)                                                              |
| [Example 5: Add a personalized message to your Share URL for a warm welcome](#example-5-add-a-personalized-message-to-your-share-url-for-a-warm-welcome)                                                          |
| [Example 6: Only add a participant if they were referred](#example-6-only-add-a-participant-if-they-were-referred)                                                                                                |
| [Example 7: Hide the GrowSurf Embedded Form until a GrowSurf participant is detected](#example-7-hide-the-growsurf-embedded-form-until-a-growsurf-participant-is-detected)                                        |
| [Example 8: Add internationalization support for the GrowSurf Embedded Form and Embedded Invite](#example-8-add-internationalization-support-for-the-growsurf-embedded-form-and-embedded-invite)                  |
| [Example 9: Update pre-populated share and email invite messages to capitalize on a customer "aha moment"](#example-9-update-pre-populated-share-and-email-invite-messages-to-capitalize-on-a-customer-aha-momen) |
| [Example 10: Load multiple GrowSurf programs on a single webpage](#example-10-load-multiple-growsurf-campaigns-on-a-single-webpage)                                                                               |
| [Example 11: Display a referral link on your login page](#example-11-display-a-referral-link-on-your-login-page)                                                                                                  |
| [Example 12: Display "You came through a referral link!" on your signup page](#example-12-display-you-came-through-a-referral-link-on-your-signup-page)                                                           |

## Example 1: Trigger a referral on qualifying action (e.g, on conversion, purchase, or upgrade)

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add the participant

{% hint style="warning" %}
**Important Note:** If your program is configured to add participants automatically through a form on your website ([see image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LgbRcVrYaKYUhQVctKK%2F-LgbS62PrNqHiJm-qwdI%2FScreen%20Shot%202019-06-05%20at%207.42.50%20PM.png?alt=media\&token=85e064ce-4bac-4617-9481-f80215478d51)), skip this ste&#x70;**.**
{% endhint %}

First, in the code where you capture the referred friend's email address, add them to your GrowSurf program as a participant with [`growsurf.addParticipant()`](/developer-tools/javascript-sdk/api-reference.md#add-participant). Let's say you have a signup function called `signUpFree()`, here's what that looks like:

{% code title="your-script.js" %}

```javascript
// In this example, a new person is just signing up for a free account
const signUpFree = (user) => {
    // ...code that registers a new user...
    // Then add the new user as a participant in your GrowSurf program
    if (window.growsurf) {
        growsurf.addParticipant({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        });
    }
};
```

{% endcode %}

{% hint style="info" %}
Behind the scenes, the GrowSurf Universal Code will associate the referrer (if they exist) with the new participant. At any future date [within the referral credit window](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfTU5fPPuEimujYPBlL%2F-LfTUYdelF4Itf1vXW9T%2FScreen%20Shot%20on%202019-05-22%20at%2015%3A42%3A38.png?alt=media\&token=b1bd5196-2825-4229-b280-0c1240b0b30e), if this new participant triggers a referral, GrowSurf will provide credit to the referrer.
{% endhint %}

### Step 3: Trigger the referral

Then, in the code where the action takes place, trigger the referral with [`growsurf.triggerReferral()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#trigger-referral) . Let's say you have a function called upgradeToPaidPlan(), here's what that looks like:

{% code title="your-script.js" %}

```javascript
// In this example, the user upgrades to a paid plan
const upgradeToPaidPlan = (user) => {
    // ...code that upgrades the user...
    // Then trigger this action as a referral trigger
    if (window.growsurf) {
        growsurf.triggerReferral(user.email);
    }
};
```

{% endcode %}

{% hint style="warning" %}
**Important Note:** Make sure your program's referral trigger is set to *Sign Up + Qualifying Action* ([see image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LnvqQyyEju4bLT4R5PC%2F-LnvsusHI0xFY2PJcJzB%2FScreen%20Shot%202019-09-04%20at%206.42.06%20PM.png?alt=media\&token=21db3d41-f20b-4887-833c-8109205cbc89)). If the referral trigger is set to *Sign Up*, triggering referrals will not work since referral credit has already been provided.
{% endhint %}

{% hint style="info" %}

#### **Remember to set up automatic reward delivery**

Make sure you have [Webhooks](/developer-tools/webhooks.md) or [Zapier](/integrations/zapier.md) set up so that rewards are automatically sent to the participant once they reach a reward goal.
{% endhint %}

## Example 2: Open GrowSurf window on button click

The GrowSurf window allows your users to retrieve their referral link to share, as well as track the status of their referrals and rewards. Follow this tutorial to learn how to open the GrowSurf window from an element, such as a button.

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% tabs %}
{% tab title="Use CSS" %}

#### Add a CSS class to your button

Add the CSS class `growsurf-open-window` to your button element. When the user clicks the button, it will open the GrowSurf window.

```html
<button class="growsurf-open-window">
   Refer and Earn
</button>
```

However, if the user is not logged in as a participant, they will see a signup form instead of their unique referral link. To ensure they always see their referral link, pass their information using the `data-grsf-email`, `data-grsf-first-name` , and `data-grsf-last-name` data attributes.

Here's a code example (remember to replace the values with your logged-in user's details):

```html
<button class="growsurf-open-window"
   data-grsf-email="gavin@hooli.com"
   data-grsf-first-name="Gavin"
   data-grsf-last-name="Belson">
  Refer and Earn
</button>
```

{% endtab %}

{% tab title="Use JavaScript" %}

#### Add `onclick="growsurf.open()"` to your button

Add `onclick="`[`growsurf.open()`](/developer-tools/javascript-sdk/api-reference.md#open-growsurf-window)`"` to your button to open the GrowSurf window when clicked.

```html
<button onclick="growsurf.open()">
  Refer Friends
</button>
```

Or use JavaScript:

```html
<button id="refer-button">
  Refer Friends
</button>

<script>
  document.getElementById('refer-button').addEventListener('click', function() {
    growsurf.open();
  });
</script>
```

However, when your user opens the GrowSurf window, they will see a signup form instead of their unique referral link unless they are already added as a participant. To ensure they always see their referral link, add or log them in as a participant first by calling [`growsurf.addParticipant()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#add-participant).

Here's a code example (remember to replace the values with your logged-in user's details):

```html
<button onclick="growsurf.addParticipant({
               email: 'gavin@hooli.com',
               firstName: 'Gavin',
               lastName: 'Belson'
            });
            growsurf.open();">
  Refer Friends
</button>
```

Or use JavaScript:

```html
<button id="refer-button">
  Refer Friends
</button>

<script>
  document.getElementById('refer-button').addEventListener('click', function() {
    growsurf.addParticipant({
      email: 'gavin@hooli.com',
      firstName: 'Gavin',
      lastName: 'Belson'
    });
    growsurf.open();
  });
</script>
```

{% endtab %}
{% endtabs %}

## Example 3: Display a participant's unique share link and referral count inline on a webpage

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% tabs %}
{% tab title="Use Embeddable Elements" %}

#### Add the [Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) anywhere in your HTML

Just paste `<div data-grsf-block-form></div>` anywhere in your HTML, and the GrowSurf form will appear. If you want your participant to be already logged in and see their unique referral link (instead of the form), add an attribute `data-grsf-email` and set it to the participant's email address.

{% hint style="warning" %}
**Important Note:**

If you have participant authentication enabled for your program, then the participant's unique share link and social buttons will only display if the participant entered your referral/affiliate program from their browser (either through automatic form detection, the GrowSurf form, or the JavaScript SDK). This is because a browser cookie will be saved that identifies the participant. Otherwise, the signup form will be shown, and the participant can click the *login* link to get sent a one-time login email.
{% endhint %}

{% code title="index.html" %}

```html
<!-- Providing just this code will make the GrowSurf form appear -->
<div data-grsf-block-form></div>

<!-- Add a `data-grsf-email` attribute to authenticate the participant -->
<div data-grsf-block-form
 data-grsf-email="gavin@hooli.com">
</div>

<!-- You can also completely customize the Embedded Form, shown in this example -->
<div data-grsf-block-form
 data-grsf-email="gavin@hooli.com"
 data-grsf-button-style="{'background-color': '#5890E7', 'color': '#fcfcfc', 'font-family': 'Sans', 'font-size': '12px'}"
 data-grsf-email-button-style="{'background-color': '#5890E7', 'color': '#fcfcfc', 'font-family': 'Arial', 'font-size': '12px'}"
 data-grsf-email-button-text="Share"
 data-grsf-twitter-button-style="{'background-color': '#5890E7', 'font-family': 'Arial', 'font-size': '12px'}"
 data-grsf-twitter-button-text="Share"
 data-grsf-facebook-button-style="{'background-color': '#5890E7', 'font-family': 'Courier New', 'font-size': '12px'}"
 data-grsf-facebook-button-text="Share"
 data-grsf-pinterest-button-style="{'background-color': '#5890E7', 'letter-spacing': '1.2', 'font-size': '12px'}"
 data-grsf-pinterest-button-text="Pin It"
 data-grsf-share-instructions="Share this unique link with your friends">
</div>
```

{% endcode %}
{% endtab %}

{% tab title="Use JavaScript" %}

#### Call `growsurf.getParticipantByEmail()`

Fetch a participant's information using [`growsurf.getParticipantByEmail()`](/developer-tools/javascript-sdk/api-reference.md#get-participant-by-email).

Here's an example of retrieving the participant data, then updating the `#share-url` and `#referral-count` HTML elements to show their unique referral link and referral count.

{% code title="index.html" %}

```html
<!DOCTYPE html>
<html>
<head>
	<title>Your Referral Stats</title>
	<!-- The GrowSurf Universal Code -->
	<script type="text/javascript">
		(function(g,r,s,f){g.growsurf={};g.grsfSettings={campaignId:"REPLACE_ME_WITH_YOUR_CAMPAIGN_ID",version:"2.0.0"};s=r.getElementsByTagName("head")[0];f=r.createElement("script");f.async=1;f.src="https://growsurf.com/growsurf.js"+"?v="+g.grsfSettings.version;f.setAttribute("grsf-campaign", g.grsfSettings.campaignId);!g.grsfInit?s.appendChild(f):"";})(window,document);
	</script>
</head>
<body>
	<input id="share-url" type="text" disabled>
	<div id="referral-count"></div>

	<script>
	    // Listen and wait for Growsurf to initialize
	    window.addEventListener('grsfReady', () => {
	        const participantEmail = 'sarah@website.com'; // replace with your user's email
        	// Get the GrowSurf participant's information
		growsurf.getParticipantByEmail(participantEmail).then(participant => {
			document.getElementById("share-url").value = participant.shareUrl;
			document.getElementById("referral-count").innerHTML = participant.referralCount;
		});
	    });
	</script>
</body>
</html>
```

{% endcode %}
{% endtab %}
{% endtabs %}

## Example 4: Redirect to another URL after a successful participant signup

This is for when you want to redirect to another webpage after a participant successfully signs up for your referral/affiliate program.

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% tabs %}
{% tab title="Use Embeddable Elements" %}
If you are using the [Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form), you can add the following HTML attribute: `data-grsf-redirect-url`.

Remember to replace `https://replaceme.com` with your redirect URL.

```html
<div data-grsf-block-form
 data-grsf-redirect-url="https://replaceme.com">
</div>
```

{% endtab %}

{% tab title="Use JavaScript" %}
If you are using your own form via automatic form detection or JavaScript Web API, then include the following snippet of code within the `<HEAD>` of the HTML source code. This should be the same page(s) where you have included the [GrowSurf Universal Code](https://docs.growsurf.com/developer-tools/javascript-sdk#step-1-make-sure-the-growsurf-universal-code-is-installed). Remember to replace `https://replaceme.com` at line 7 with your redirect URL.

```markup
<script>
    // Listen and wait for the Growsurf Universal Code to initialize
    window.addEventListener('grsfReady', () => {
        console.log('GrowSurf is Ready!');
        // Your redirect code goes here....
        growsurf.subscribe('signup', (participant) => {
          window.location.replace("http://replaceme.com");
        });
    });
</script>
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
If the redirect is not working, the form submission is most likely failing. Check your browser console for errors.
{% endhint %}

## Example 5: Add a personalized message to your Share URL for a warm welcome

When a new visitor lands on your site using their friend's unique link, you can personalize a message for them with [`growsurf.getReferrerId()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-referrer-id) and [`growsurf.getParticipantById()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-participant-by-id). In this example, we have a simple page with a `h1#header` that will display as *"Emily S. invited you to pet puppies on-demand"* if a referrer exists, otherwise it will display as *"Pet puppies on-demand"*.

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% tabs %}
{% tab title="index.html" %}

```html
<html>
	<body>
		<h1 id="header">Pet puppies on-demand</h1>
	</body>
	<script>
		window.addEventListener('grsfReady', () => {
			const referrerId = growsurf.getReferrerId();
			if (referrerId) {
				growsurf.getParticipantById(referrerId).then(participant => {
					if (participant) {
						const { firstName, lastName = '' } = participant;
						const lastNameAsString = (lastName).toString();
						const newHeader = `${firstName && lastName ? firstName + ' ' + lastNameAsString.charAt(0) + '. invited you to pet puppies on-demand' : 'Pet puppies on-demand'}`;
						const headerEl = document.getElementById('header');
						headerEl.innerHTML = newHeader;
					}
				});
			}
		});
	</script>
</html>
```

{% endtab %}
{% endtabs %}

## Example 6: Only add a participant if they were referred

In this example, we will only add a participant if they were referred by another participant within your program. We will use [`growsurf.addReferredParticipant()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#add-referred-participant), which validates the referrer and creates a participant only when the referrer is valid.

The example code also assumes that you have set up a submit listener on your form which will listen for submission events and invoke the callback function described below. If you are not sure how to add a form submission listener [here is an example](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event).

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% hint style="warning" %}
This code is for demonstration purposes only. You may need to modify it to work on your website.
{% endhint %}

{% tabs %}
{% tab title="index.html" %}

```html
<html>
	<body>
		<h1 id="header">Pet puppies on-demand</h1>
		<!-- Example form only, this must be replaced with your actual form -->
		<form id="form">
	  		<label>Email: <input name="email" type="text"></label>
  			<button type="submit">Submit form</button>
		</form>
	</body>
	<script>
		// Listen for the GrowSurf Ready Event
		window.addEventListener('grsfReady', () => {
			// Add an event listener to the example form to listen for submissions
			const form = document.getElementById('form');
			form.addEventListener('submit', onFormSubmit);
		});

		// Callback function that is invoked when a new visitor has just submitted a form on your website
		const onFormSubmit = (event) => {
		    // Get the value of the email - Update this depending on your form
		    const userEmail = event.target.email.value;
		    // Only add the participant if a valid referrer exists
		    if (window.growsurf) {
		        window.growsurf.addReferredParticipant({ email: userEmail });
		    }
		    event.preventDefault();
		};
	</script>
</html>
```

{% endtab %}
{% endtabs %}

This example attempts referral-only participant creation on every form submission, even if the form is not valid. Validating the form first requires extra code and is out of scope for this example.

## Example 7: Hide the GrowSurf Embedded Form until a GrowSurf participant is detected

Let's say you are using the [Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) and passing an email address as a data attribute so that a participant gets created. Because GrowSurf needs to wait for a network request to finish, the signup form may be shown for a few seconds or less. To change this behavior to hide the signup form, you can use the following HTML, CSS, and JS (jQuery) code as an example below.

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% tabs %}
{% tab title="HTML" %}

```html
<div data-grsf-block-form
  data-grsf-email="sarah@smith.com"
  class="hide-until-grsf-auth"></div>
```

{% endtab %}

{% tab title="CSS" %}

```css
.show-after-grsf-auth { display: initial }
.hide-until-grsf-auth { display: none }
```

{% endtab %}

{% tab title="JS (jQuery)" %}

```javascript
// Check if a participant is logged-in, and display auth views based on if there is a participant
function showGrsf() {
	var participantAuth = growsurf.getParticipantId();
	if (participantAuth) {
		$('.hide-until-grsf-auth').addClass('show-after-grsf-auth');
	} else {
		// Subscribe to a 'GrowSurf signup' event listener
		growsurf.subscribe('signup', function(participant) {
		  $('.hide-until-grsf-auth').addClass('show-after-grsf-auth');
		});
	}
}

// See if GrowSurf is available
if(!window.growsurf) {
	// Listen and wait for the Growsurf Universal Code to initialize
	window.addEventListener('grsfReady', function() {
		showGrsf();
	});
} else {
	showGrsf();
}
```

{% endtab %}
{% endtabs %}

## Example 8: Add internationalization support for the GrowSurf Embedded Form and embedded invite

Use GrowSurf embeddable elements to support multiple languages on your website. This example customizes data attributes on the [Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) and [Embedded Invite](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-invite) elements to display text in both English and Spanish.

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

{% tabs %}
{% tab title="Embedded Form" %}
These examples only use `facebook` and `twitter` as the enabled social share buttons. If you have other social share options enabled, make sure to account for them.\
\
These examples also assume that you have a custom signup field called "Phone Number" ([see image](https://gblobscdn.gitbook.com/assets%2F-LeklWo0yn03AhWro2Ux%2F-MZLXwjfm2woyi5XcNvF%2F-MZLYxUjnDT8b5lUVQlO%2Fmain_full.png?alt=media\&token=d328abcb-ca39-46b0-8878-cbbe447198c7)). Custom fields are supported via [kebab-case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles) (see example usage of `phone-number` at lines 6 and 7 in the code snippets below).

**In English:**

```html
<div data-grsf-block-form
 data-grsf-field-first-name-label="First name"
 data-grsf-field-first-name-placeholder="First name"
 data-grsf-field-first-name-label="Last name"
 data-grsf-field-first-name-placeholder="Last name"
 data-grsf-field-phone-number-label="Phone number"
 data-grsf-field-phone-number-placeholder="Phone number"
 data-grsf-share-instructions="Share this unique link with your friends"
 data-grsf-copy-link-button-text="Copy Link"
 data-grsf-email-button-text="Share"
 data-grsf-email-button-message="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-email-button-subject="Check this out friend"
 data-grsf-facebook-button-text="Share"
 data-grsf-facebook-button-message="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-twitter-button-text="Share"
 data-grsf-twitter-button-message="I just saved $X,XXX by using this service! {{shareUrl}}">
</div>
```

**In Spanish:**

```html
<div data-grsf-block-form
 data-grsf-field-first-name-label="Primer nombre"
 data-grsf-field-first-name-placeholder="Primer nombre"
 data-grsf-field-first-name-label="Apellido"
 data-grsf-field-first-name-placeholder="Apellido"
 data-grsf-field-phone-number-label="Número de teléfono"
 data-grsf-field-phone-number-placeholder="Número de teléfono"
 data-grsf-share-instructions="Comparte este enlace único con tus amigos"
 data-grsf-copy-link-button-text="Copiar link"
 data-grsf-email-button-text="Cuota"
 data-grsf-email-button-message="¡Acabo de ahorrar $X,XXX al usar este servicio! {{shareUrl}}"
 data-grsf-email-button-subject="Mira esto amigo"
 data-grsf-facebook-button-text="Cuota"
 data-grsf-facebook-button-message="¡Acabo de ahorrar $X,XXX al usar este servicio! {{shareUrl}}"
 data-grsf-twitter-button-text="Cuota"
 data-grsf-twitter-button-message="¡Acabo de ahorrar $X,XXX al usar este servicio! {{shareUrl}}">
</div>
```

{% endtab %}

{% tab title="Embedded Invite" %}
These examples used `Google` as the enabled address book. If you have other address books enabled, make sure to account for them.

**In English:**

```html
<div data-grsf-block-invite
 data-grsf-input-placeholder-text="Enter email addresses here"
 data-grsf-preview-link-text="Preview your message"
 data-grsf-preview-subject-label="Email Subject"
 data-grsf-preview-subject-placeholder="Check this out friend"
 data-grsf-preview-subject="Check this out friend"
 data-grsf-preview-message-label="Email Message"
 data-grsf-preview-message-placeholder="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-preview-message="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-submit-button-text="Send Invites"
 data-grsf-google-button-text="Import Google Contacts"
 data-grsf-contact-picker-search-text="Search"
 data-grsf-contact-picker-suggestions-text="Suggestions"
 data-grsf-contact-picker-results-text="Results"
 data-grsf-contact-picker-load-more-button-text="Load More">
</div>
```

**In Spanish:**

```html
<div data-grsf-block-invite
 data-grsf-input-placeholder-text="Ingrese las direcciones de correo electrónico aquí"
 data-grsf-preview-link-text="Vista previa de su mensaje"
 data-grsf-preview-subject-label="Asunto del email"
 data-grsf-preview-subject-placeholder="Mira esto amigo"
 data-grsf-preview-subject="Mira esto amigo"
 data-grsf-preview-message-label="Mensaje de correo electrónico"
 data-grsf-preview-message-placeholder="¡Acabo de ahorrar $X,XXX al usar este servicio! {{shareUrl}}"
 data-grsf-preview-message="¡Acabo de ahorrar $X,XXX al usar este servicio! {{shareUrl}}"
 data-grsf-submit-button-text="Enviar invitaciones"
 data-grsf-google-button-text="Importar contactos de Google"
 data-grsf-contact-picker-search-text="Buscar"
 data-grsf-contact-picker-suggestions-text="Sugerencias"
 data-grsf-contact-picker-results-text="Resultados"
 data-grsf-contact-picker-load-more-button-text="Carga más">
</div>
```

{% endtab %}
{% endtabs %}

## Example 9: Update pre-populated share and email invite messages to capitalize on a customer "aha moment"

If your product has an "[aha moment](https://userguiding.com/blog/what-is-aha-moment-how-to-find-it/)", this is a great time to ask for referrals. On your webpage or web app, display the [Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) and [Embedded Invite](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-invite) elements to provoke the participant to share.

In this example, we will use two methods [`growsurf.updateSocialShareMessage()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#update-social-share-message) and [`growsurf.updateEmailInviteMessage()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#update-email-invite-message) to update pre-populated social share messages so that the default text is more relevant to your user.

### [Step 1: Make sure the GrowSurf Universal Code is installed](/developer-tools/javascript-sdk.md#step-1-make-sure-the-growsurf-universal-code-is-installed)

### Step 2: Add code

To better illustrate this use-case, consider the following scenarios:

{% tabs %}
{% tab title="Social media SaaS" %}
Let's say you're a SaaS company that helps social media users gain more followers. You could ask for referrals once a user gains 100 followers.

Add the following HTML code (e.g, in a popup on your webpage):

```html
<div>
    <h2>💯 Alert!</h2>
    <p>Amazing, you just hit 100 followers this past week.</p>
    <div data-grsf-block-form
         data-grsf-share-instructions="Get your next month on us when you refer a friend"
         data-grsf-copy-link-container-style="{'display': 'none'}"></div>
    <div data-grsf-block-invite></div>
</div>
```

Add the following JavaScript code:

```javascript
// Sign up (or log in) your user as a GrowSurf participant
const userEmail = 'bob@boblaw.com'; // Replace with the user's email address
growsurf.addParticipant({email: userEmail});

// Set the initial message and subject line
const message = "I've just gained 100 followers by using this tool! {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the social share messages
growsurf.updateSocialShareMessage('email', message, subjectLine);
growsurf.updateSocialShareMessage('facebook', message);
growsurf.updateSocialShareMessage('twitter', message);
growsurf.updateSocialShareMessage('pinterest', message);
growsurf.updateSocialShareMessage('sms', message);
growsurf.updateSocialShareMessage('whatsapp', message);

// Update the pre-populated email invite message and subject line
growsurf.updateEmailInviteMessage(message, subjectLine);
```

If you need to call this on immediate page load, wrap the JavaScript code in a [`grsfReady` Event Listener](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener).
{% endtab %}

{% tab title="Enterprise messaging app" %}
Let's say you're a messaging SaaS (e.g, Slack). You could ask for referrals once a team sends 2,000 messages in a workspace.

Add the following HTML code (e.g, in a popup on your webpage):

```html
<div>
    <h2>Woohoo, you've just sent 2,000 messages!</h2>
    <p>That's 6 days worth of time saved in productivity.</p>
    <div data-grsf-block-form
         data-grsf-share-instructions="Share your victory:"
         data-grsf-copy-link-container-style="{'display': 'none'}"></div>
    <div data-grsf-block-invite></div>
</div>
```

Add the following JavaScript code:

```javascript
// Sign up (or log in) your user as a GrowSurf participant
const userEmail = 'bob@boblaw.com'; // Replace with the user's email address
growsurf.addParticipant(userEmail);

// Set the initial message and subject line
const message = "We've just sent 2,000 messages using this service and have saved 6 days of productivity. Love this service! {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the social share messages
growsurf.updateSocialShareMessage('email', message, subjectLine);
growsurf.updateSocialShareMessage('facebook', message);
growsurf.updateSocialShareMessage('twitter', message);
growsurf.updateSocialShareMessage('pinterest', message);
growsurf.updateSocialShareMessage('sms', message);
growsurf.updateSocialShareMessage('whatsapp', message);

// Update the pre-populated email invite message and subject line
growsurf.updateEmailInviteMessage(message, subjectLine);
```

If you need to call this on immediate page load, wrap the JavaScript code in a [`grsfReady` Event Listener](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener).
{% endtab %}

{% tab title="Food delivery service" %}
Let's say you're a food delivery service company (e.g, Doordash). You could ask for referrals once the user leaves a positive review after a delivery.

Add the following HTML code (e.g, in a popup on your webpage):

```html
<div>
    <h2>Loving Doordash?</h2>
    <div data-grsf-block-form
         data-grsf-share-instructions="Get your next meal on us, up to $20 when you refer a friend."
         data-grsf-copy-link-container-style="{'display': 'none'}"></div>
    <div data-grsf-block-invite></div>
</div>
```

Add the following JavaScript code:

```javascript
// Sign up (or log in) your user as a GrowSurf participant
const userEmail = 'bob@boblaw.com'; // Replace with the user's email address
growsurf.addParticipant(userEmail);

// Set the initial message and subject line
const message = "I just ordered delicious Wing's spicy noodle soup with DoorDash. 5/5 experience! Get $20 off your first order: {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the social share messages
growsurf.updateSocialShareMessage('email', message, subjectLine);
growsurf.updateSocialShareMessage('facebook', message);
growsurf.updateSocialShareMessage('twitter', message);
growsurf.updateSocialShareMessage('pinterest', message);
growsurf.updateSocialShareMessage('sms', message);
growsurf.updateSocialShareMessage('whatsapp', message);

// Update the pre-populated email invite message and subject line
growsurf.updateEmailInviteMessage(message, subjectLine);
```

If you need to call this on immediate page load, wrap the JavaScript code in a [`grsfReady` Event Listener](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener).
{% endtab %}
{% endtabs %}

## Example 10: Load multiple GrowSurf programs on a single webpage

If you have multiple GrowSurf programs and want to use the same landing page and/or signup pages, here's how you can load the right program depending on where the traffic is coming from.

### Step 1: Update each Share URL for each of your programs

For each of your programs, navigate to *Program Editor > 5. Installation* and update the Share URL to include a `?growsurf_campaign` parameter.

* Grab the program ID in the address bar of your browser.
* See an example in the image below:

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FRDEGlCH2v1qwAVGOFO2s%2Fimage.png?alt=media&amp;token=78bc73e8-3217-4bfe-9c52-4122a589623b" alt=""><figcaption><p>Update your Share URL with a ?growsurf_campaign parameter</p></figcaption></figure>

### Step 2: Paste this code into the \<HEAD> of your website instead of the GrowSurf Universal Code

Instead of pasting the GrowSurf Universal Code into the `<HEAD>` of your webpage(s), add the following code below. Make sure to update the `DEFAULT_GROWSURF_PROGRAM_ID` value at line 3 to your own default program ID.

```html
<script type="text/javascript">
   // Update these parameters
   const DEFAULT_GROWSURF_PROGRAM_ID = 'abc123'; // (Optional) Replace with your default program ID. This will be used as a fallback if provided.

   // Additional configurable parameters
   const GROWSURF_PROGRAM_ID_URL_PARAM = 'growsurf_campaign';
   const GROWSURF_PROGRAM_ID_COOKIE_NAME = 'growsurf_campaign'; // Make it the same name as the URL param for simplicity

    function getBaseDomain() {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 1) { return '.' + parts.slice(-2).join('.'); }
      return hostname;
   }

   function getQueryParam(name) {
      const urlParams = new URLSearchParams(window.location.search);
      const value = urlParams.get(name);
      if (value && value.includes('?')) {
         return value.split('?')[0];
      }
      return value;
   }

   function setCookie(name, value, days) {
      let expires = "";
      if (days) {
         const date = new Date();
         date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
         expires = "; expires=" + date.toUTCString();
      }
      const domain = getBaseDomain();
      document.cookie = `${name}=${value}; domain=${domain}; path=/;${expires}`;
   }

   function getCookie(name) {
      const nameEQ = `${name}=`;
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
         let c = ca[i];
         while (c.charAt(0) === ' ') c = c.substring(1, c.length);
         if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
   }

   const growsurfProgramIdInUrlParam = getQueryParam(GROWSURF_PROGRAM_ID_URL_PARAM);
   if (growsurfProgramIdInUrlParam) {
      setCookie(GROWSURF_PROGRAM_ID_COOKIE_NAME, growsurfProgramIdInUrlParam, 365); // Stores program ID in cookie for 365 days
   }
   const growsurfProgramId = getCookie(GROWSURF_PROGRAM_ID_COOKIE_NAME) || DEFAULT_GROWSURF_PROGRAM_ID;
   if (growsurfProgramId) {
      console.log('Loading GrowSurf Universal Code with program ID:', growsurfProgramId);
      // Call the GrowSurf Universal Code
      (function(g,r,s,f){g.grsfSettings={campaignId:growsurfProgramId,version:"2.0.0"};s=r.getElementsByTagName("head")[0];f=r.createElement("script");f.async=1;f.src="https://app.growsurf.com/growsurf.js"+"?v="+g.grsfSettings.version;f.setAttribute("grsf-campaign", g.grsfSettings.campaignId);!g.grsfInit?s.appendChild(f):"";})(window,document);
   }
</script>
```

{% hint style="info" %}
**Here's what this code does:**

* Referral links will now look something like this: `https://mysite.com?growsurf_campaign=abc123&grsf=xyz789` . The program ID is `abc123` and will be saved as a cookie for 365 days. So when a referred friend lands on a referral link, the appropriate program ID will first be loaded. (The referrer ID `xyz789` is also automatically saved as a cookie).
* If that referred friend revisits or returns to your site (e.g, `mysite.com`) even without using a referral link, the appropriate program will still be loaded b/c the program ID was saved as a cookie.
* Once the referred friend signs up, the program that they originally came through a referral link from will be the one they get added to.
* If a website visitor did not use a referral link to land on your website and sign ups, the fallback program `abc123` will be the one used.
  {% endhint %}

## Example 11: Display a Referral Link on Your Login Page

Display referral links to users on your login page. This reminds returning users of your referral/affiliate program and gives them their referral link to share.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FSwy9e7TGfkcxOWmSvysk%2Fimage.png?alt=media&amp;token=a568194b-ba09-4dc1-a633-fe5f7fe6a398" alt=""><figcaption><p>Display a referral link to returning users on your login page</p></figcaption></figure>

This tutorial uses React, Firebase Authentication, and the GrowSurf JavaScript SDK.

{% hint style="success" %}
**Demo:** To view a working demo and to access the full code, [click here](https://codesandbox.io/p/sandbox/54r4g5).
{% endhint %}

### Step 1: Install GrowSurf in Your React App

The first step is to install the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) by dynamically injecting it into your React app.

Inside your `App.js`, add the following function and use it in a `useEffect`:

```jsx
const GROWSURF_PROGRAM_ID = "x8yi1l" // Replace with your own program ID

const addGrsfScript = () => {
  if (document.querySelector('script[src*="growsurf.js"]')) return;
  const script = document.createElement("script");
  script.src = "https://app.growsurf.com/growsurf.js?v=2.0.0";
  script.setAttribute("grsf-campaign", GROWSURF_PROGRAM_ID);
  script.async = true;
  document.head.appendChild(script);
};

useEffect(() => {
  onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
  });

  if (document.readyState === "complete") {
    addGrsfScript();
  } else {
    window.addEventListener("load", addGrsfScript);
    return () => window.removeEventListener("load", addGrsfScript);
  }
}, []);
```

{% hint style="danger" %}
**Important**: Make sure to replace `x8yi1l` at line 1 with your own program ID.
{% endhint %}

This ensures GrowSurf loads once when the app starts.

### Step 2: Register Users and Add Them to GrowSurf

For the purpose of this demo, this is the logic that we'll have when a new user registers:

1. Create the user in Firebase
2. Add the user to GrowSurf using [`growsurf.addParticipant()`](/developer-tools/javascript-sdk/api-reference.md#add-participant)
3. Redirect them to the Profile page

This is what the `register()` function in the `Register.js` file looks like:

```jsx
const register = (e) => {
  e.preventDefault();
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      // Add user to GrowSurf
      if (window.growsurf?.addParticipant) {
        window.growsurf.addParticipant(user.email);
      }
      navigate("/"); // Redirect to profile
    })
    .catch((err) => setError(err.message));
};

```

### Step 3: Display Profile Page After Login/Registration

In the `Profile.js` file, we'll show the user’s email and display a Logout button:

```jsx
<h2>Welcome, {currentUser.email}</h2>
<button onClick={logout}>Logout</button>
```

When the user logs out, they’re redirected back to the Login page.

### **Step 4:** Login and Validate the GrowSurf Participant

When a user logs in, we'll have the following logic be executed:

1. After a successful Firebase login, check if the user exists in your GrowSurf program using [`growsurf.getParticipantByEmail(email)`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-participant-by-email).
2. If the user exists in the program, call [`growsurf.addParticipant(email)`](/developer-tools/javascript-sdk/api-reference.md#add-participant) to log them in as a GrowSurf participant.

Here's what we have in the `Login.js` file:

```jsx
const login = (e) => {
  e.preventDefault();
  setError("");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      if (window.growsurf?.getParticipantByEmail) {
        window.growsurf.getParticipantByEmail(email, (participant) => {
          if (participant) {
            // Initialize GrowSurf participant session
            window.growsurf.addParticipant(email, () => {
              localStorage.setItem("hasLoggedIn", "true");
              setShowReferral(true);
              navigate("/");
            });
          }
        });
      } else {
        setError("GrowSurf is not ready. Please try again shortly.");
      }
    })
    .catch((err) => setError(err.message));
};
```

### Step 5: Show the Referral Widget (Only After Logout)

After tracking the user login state, we can now conditionally display the [GrowSurf Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) (aka the referral link) on the Login page, but only after logout.

```jsx
{showReferral && (
  <div className="referral-sidebar">
    <div
      data-grsf-block-form
      data-grsf-share-instructions="<h3 style='text-align: center;'>Refer a friend</h3>"
      data-grsf-social-buttons-layout-theme="3"
      data-grsf-copy-link-button-layout-theme="3"
    ></div>
  </div>
)}

```

{% hint style="info" %}
**Important note on authentication:**\
This tutorial focuses on integrating GrowSurf referral tracking in a React app using Firebase for authentication. However, the same concepts apply no matter what auth system you’re using (Supabase, Auth0, a custom backend, etc).

For simplicity, the tutorial assumes that returning users already exist in both your authentication system and your GrowSurf program.

This tutorial doesn’t cover all security details, and you'll want to adapt the logic to fit your own authentication flow and app structure.
{% endhint %}

## Example 12: Display "You came through a referral link!" on Your Signup Page

Display a message like “You came through a referral link!” on your signup page with these three GrowSurf JavaScript SDK methods:

* [`growsurf.getReferrerId()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-referrer-id) to fetch the referrer ID (aka the referral code)
* [`growsurf.getCampaign()`](/developer-tools/javascript-sdk/api-reference.md#get-campaign) to fetch custom reward metadata (for displaying the `50` in "$50 discount will automatically be applied to your account.")
* [`growsurf.addReferredParticipant()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#add-referred-participant) to add new referred signups

The use-case for this scenario is for verifying to referred visitors that they came through a referral link.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FT4fuBb7PB0uEwQem0a8R%2FScreen%20Shot%202025-04-23%20at%205.56.44%20PM.jpg?alt=media&amp;token=b121d512-b74d-4bbc-aa11-c07ed8427d48" alt=""><figcaption><p>Display "You came through a referral link!" on your signup page</p></figcaption></figure>

This tutorial uses React, Firebase Authentication, and the GrowSurf JavaScript SDK.

{% hint style="success" %}
**Demo:**

* To view a working demo, [click here](https://dgxz4y.csb.app/?grsf=ay7rx1) and navigate to the signup page.
* To access the full code, [click here](https://codesandbox.io/p/sandbox/dgxz4y).
  {% endhint %}

From this tutorial, the following can be assumed:

* The GrowSurf Universal Code will be dynamically injected in `App.js`
* User authentication is via Firebase Auth and Firebase Realtime Database
* `growsurf.addReferredParticipant(email)` will be called after user signup to track referrals
* The login state is managed using a custom `AuthContext.js`

### Step 1: Install GrowSurf in Your React App

The first step is to install the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) by dynamically injecting it into your React app.

Inside your `App.js`, add the following function and use it in a `useEffect`:

```jsx
const GROWSURF_PROGRAM_ID = "x8yi1l" // Replace with your own program ID

const addGrsfScript = () => {
  if (document.querySelector('script[src*="growsurf.js"]')) return;
  const script = document.createElement("script");
  script.src = "https://app.growsurf.com/growsurf.js?v=2.0.0";
  script.setAttribute("grsf-campaign", GROWSURF_PROGRAM_ID);
  script.async = true;
  document.head.appendChild(script);
};

useEffect(() => {
  onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
  });

  if (document.readyState === "complete") {
    addGrsfScript();
  } else {
    window.addEventListener("load", addGrsfScript);
    return () => window.removeEventListener("load", addGrsfScript);
  }
}, []);
```

{% hint style="danger" %}
**Important**: Make sure to replace `x8yi1l` at line 1 with your own program ID.
{% endhint %}

This ensures GrowSurf loads once when the app starts.

### Step 2: Get the `referralId` and show the referral message on the registration page

Now switch to `Register.js`. Inside a `useEffect`, check if a referral ID is stored by calling [`growsurf.getReferrerId()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-referrer-id).

If there is a referrer ID, then show a banner that says "You came through a referral link! $50 discount will automatically be applied to your account." Get the `50` by fetching the reward amount from your GrowSurf program's reward metadata by calling [`growsurf.getCampaign()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-campaign):

```jsx
useEffect(() => {
  if (window.growsurf?.getReferrerId) {
    const referrerId = window.growsurf.getReferrerId();

    if (referrerId) {
      setShowReferralBanner(true);

      if (window.growsurf?.getCampaign) {
        window.growsurf.getCampaign((campaign) => {
          const reward = campaign?.rewards?.[0];
          const rewardValue = reward?.metadata?.rewardForReferred;

          if (rewardValue !== undefined) {
            setRewardAmount(rewardValue);
          }
        });
      }
    }
  }
}, []);
```

This code does two things:

1. Shows a referral banner only if a referrer ID is stored. The `growsurf.getReferrerId()` method checks if there is a referral cookie stored (which would be present if the visitor initially came from a referral link).
2. Uses `growsurf.getCampaign()` to fetch the metadata of your program's first reward. Note, you'll need to have [set the reward metadata](https://docs.growsurf.com/developer-tools/metadata#reward-metadata-1).

Then render the message inside your JSX:

```jsx
{showReferralBanner && rewardAmount !== null && rewardAmount !== undefined && (
  <div style={{
    backgroundColor: "#fff3cd",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "15px",
    border: "1px solid #ffeeba",
    color: "#856404",
    fontWeight: "bold",
  }}>
    You came through a referral link! <strong>${rewardAmount} discount</strong> will automatically be applied to your account.
  </div>
)}
```

### **Step 3:** Register Users and Add Them to GrowSurf

When a new user signs up, you’re already registering them with Firebase Auth. After that, use [`growsurf.addParticipant()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#add-participant) to add them to your GrowSurf program:

```jsx
if (response?.user?.email) {
  window.growsurf.addParticipant(response.user.email, () => {
    // Mark that this user is part of GrowSurf
    localStorage.setItem("isGrowSurfParticipant", "true");
  });
}
```

{% hint style="warning" %}
**Important note on applying the $50 discount upfront:**

This tutorial does not cover how to apply the $50 discount the new user who just signed up. To view how to apply the actual discount, [view this article](https://support.growsurf.com/article/280-how-can-i-have-a-coupon-code-instantly-available-for-a-referred-person-before-they-sign-up).
{% endhint %}


# Single Page Applications

View sample code and troubleshooting tips for integrating GrowSurf into common JavaScript frameworks such as React and Vue.

{% hint style="info" %}
To test in a sandbox/development environment, we recommend creating two different programs for development and production environments. [Learn more here](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
{% endhint %}

## GitHub

[Check out the `growsurf-samples` GitHub repo for sample code](https://github.com/growsurf/growsurf-samples).

## React

Check out the GitHub sample code for React [here](https://github.com/growsurf/growsurf-samples/tree/master/samples/growsurf-react-example) and our [GrowSurf React project](https://github.com/growsurf/growsurf-react-firebase).

### React Component

To initialize GrowSurf asynchronously within your SPA, include the following code within your [React components `componentDidMount()`](https://reactjs.org/docs/react-component.html#componentdidmount) lifecycle event.

{% hint style="info" %}
`componentDidMount()` works only in class components. In a function component, use the [Effect Hook](https://reactjs.org/docs/hooks-effect.html).
{% endhint %}

### Example using Classes

This code adds the GrowSurf Universal Code only on pages that render this component, and once it has [initialized](/developer-tools/javascript-sdk.md#grsfready-event-listener), you can add any [GrowSurf embeddable element](/developer-tools/embeddable-elements.md) to the component's JSX.

{% code title="App.js" %}

```jsx
 class App extends React.Component {
   componentDidMount() {
    const script = document.createElement('script');
    script.src = 'https://app.growsurf.com/growsurf.js?v=2.0.0';
    script.setAttribute('grsf-campaign', 'jaoh4t');
    script.async = true;
    document.head.appendChild(script);
  }

  render() {
  return (
    <div>
      <div className='App'>REACT + GROWSURF</div>
      <div data-grsf-block-form></div>
    </div>
    )
  }
  }
```

{% endcode %}

### Example using Effect Hook

{% code title="App.js" %}

```jsx
  import {useEffect} from 'react'

  function App() {
    // GrowSurf Universal Code
    const addGrsfScript = () => {
      const script = document.createElement('script');
      script.src = 'https://app.growsurf.com/growsurf.js?v=2.0.0';
      script.setAttribute('grsf-campaign', 'jaoh4t');
      script.async = true;
      document.head.appendChild(script);
  };

    useEffect(() => {
    addGrsfScript();
    }, [])
  }
```

{% endcode %}

{% hint style="info" %}
In React, third-party JavaScript SDKs like GrowSurf's are not automatically accessible within the Virtual DOM. To interact with them, you must reference them via the `window` object.\
\
**Example**

```javascript
window.growsurf.getParticipantId();
```

{% endhint %}

## Vue

[Check out the GitHub sample code for Vue here](https://github.com/growsurf/growsurf-samples/tree/master/samples/growsurf-vue-example).

## Troubleshooting

If embeddable elements do not render (typically after a page refresh on an absolute route, depending on how your SPA handles URL routes), call [`growsurf.init()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-reinitialize-growsurf) to re-initialize GrowSurf.



# API Reference

This reference documents the GrowSurf JavaScript SDK, including all available public methods and examples of each.

{% hint style="info" %}
**Using AI?** Follow [Build with AI](https://docs.growsurf.com/build-with-ai).
{% endhint %}

Use this page to look up individual GrowSurf JavaScript SDK methods. All asynchronous methods support both callback and Promise styles unless otherwise noted.

## SDK LIFECYCLE ↓

### Initialize / Reinitialize GrowSurf

Initializes or reinitializes the `window.growsurf` Object.

{% hint style="info" %}
The method is useful for the following use-cases:

* If you have participant authentication enabled for your program and you would like to [automatically authenticate](/getting-started/participant-auto-authentication.md) your participants after they log in within your own user portal.
* Load multiple programs on a single webpage depending on where the traffic is coming from. [View a tutorial here](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-10-load-multiple-growsurf-campaigns-on-a-single-webpage).
  {% endhint %}

```javascript
growsurf.init(settings);
```

**Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.init({ email: "participant@email.com", hash: "HASH_VALUE" }, () => {
    // GrowSurf is Ready
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a promise
growsurf.init({ email: "participant@email.com", hash: "HASH_VALUE" }).then(() => {
    // GrowSurf is Ready
});
```

{% endtab %}
{% endtabs %}

| Parameter      | Data Type | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`settings`** | Object    | <p>(Optional) The settings GrowSurf should use when initializing or reinitializing.</p><ul><li><strong><code>campaignId</code></strong>- Provide this to initialize another program</li><li><strong><code>email</code>-</strong> The email of the participant you wish to <a href="/getting-started/participant-auto-authentication.md">auto authenticate</a> (only applies if authentication is enabled for your program).</li><li><strong><code>hash</code></strong>- The hash token generated by your server. Used to <a href="/getting-started/participant-auto-authentication.md">auto authenticate</a> a participant (only applies if authentication is enabled for your program).</li></ul> |

***

### Get participant ID

Returns the ID of the authenticated participant or **`null`** if there is no participant authentication cookie present.

{% hint style="info" %}
**Example:** Someone signed up as a participant in your referral/affiliate program from your website. Calling this method will return `aj7auu1` (which is the participant ID).
{% endhint %}

```javascript
growsurf.getParticipantId();
```

#### **Example use**

```javascript
growsurf.getParticipantId();
```

**Example response**

```javascript
"aj7auu1"
```

***

### Log out

Logs the participant out of the browser (clears the participant's GrowSurf browser cookie and local storage).

```javascript
growsurf.logout();
```

#### **Example use**

```javascript
growsurf.logout();
```

***

## CAMPAIGNS ↓

### Get campaign

Retrieves limited details of your program.

```javascript
growsurf.getCampaign(callback);
```

| Parameter      | Data Type | Description                                                                |
| -------------- | --------- | -------------------------------------------------------------------------- |
| **`callback`** | Function  | (Optional) A callback function that will be invoked with the program data. |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited program data of `id` and `rewards`.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getCampaign((campaign) => {
    // Handle Campaign
    console.log(campaign);
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.getCampaign().then(campaign =>  {
    // Handle Campaign
    console.log(campaign);
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "bpsxg4",
    "type": "REFERRAL",
    "rewards": [
        {
            "id": "crew_xyz789",
            "type": "DOUBLE_SIDED",
            "description": "Refer a friend and get $20",
            "referralDescription": "Sign up and get $10 off your first invoice",
            "referredRewardUpfront": false,
            "isUnlimited": false,
            "limit": 1,
            "conversionsRequired": 1,
            "numberOfWinners": 3,
            "imageUrl": "https://piedpiper.com/reward-image.png",
            "metadata": {
                "rewardValueForReferrer": 20,
                "rewardValueForReferred": 10
            },

            // Only for affiliate programs:
            "commissionStructure": {
                "amount": null,
                "event": "SALE",
                "type": "PERCENT",
                "minPaidReferrals": 3,
                "holdDuration": 30,
                "duration": "FOREVER",
                "durationInMonths": 12,
                "approvalRequired": false,
                "percent": 50,
                "hasMaxAmount": false,
                "maxAmount": null,
                "maxAmountISO": "USD",
                "hasIntro": false,
                "introType": null,
                "introPercent": null,
                "introAmount": null,
                "introAmountISO": "USD",
                "introDuration": "REPEATING",
                "introDurationInMonths": 2
            }
        }
    ]
}
```

***

## GROWSURF WINDOW ↓

### Open GrowSurf window

Opens the GrowSurf window.

```javascript
growsurf.open(callback);
```

| **Parameter**  | Data Type | Description                                                       |
| -------------- | --------- | ----------------------------------------------------------------- |
| **`callback`** | Function  | (Optional) A callback function that will be invoked once complete |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves once complete.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.open(function() {
    // Do something here
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.open().then(() => {
    // Do something here
});
```

{% endtab %}
{% endtabs %}

{% hint style="success" %}

#### **CSS Alternative:**

Instead of using the JavaScript method `growsurf.open()`, you can add a CSS class `growsurf-open-window` to a button.

A benefit of this option is that if the participant has any unread rewards, the unread badge will automatically show up as well.\
\
**Here is an example:**

```html
<a class="growsurf-open-window">
  Refer and Earn
</a>
```

**Note:** You'll need to make sure you have the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) installed.
{% endhint %}

***

### Close GrowSurf window

Closes the GrowSurf window.

```javascript
growsurf.close(callback);
```

| **Parameter**  | Data Type | Description                                                       |
| -------------- | --------- | ----------------------------------------------------------------- |
| **`callback`** | Function  | (Optional) A callback function that will be invoked once complete |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves once complete.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.close(() => {
    // Do something here
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.close().then(() => {
    // Do something here
});
```

{% endtab %}
{% endtabs %}

***

## REFERRERS ↓

### Get referrer ID

Returns the ID of the participant that referred the visitor or **`null`** if the visitor was not referred. This method will first check to see if a `grsf` URL parameter exists, then will check for the presence of a referrer ID as a browser cookie (which was set from the initial visit).

{% hint style="info" %}
**Example:** If someone refers their friend, and the friend visits `https://yoursite.com?grsf=1h97da`, calling this method will return `1h97da` (which is the referrer ID).
{% endhint %}

```javascript
growsurf.getReferrerId();
```

#### **Example use**

```javascript
growsurf.getReferrerId();
```

#### Example response

```javascript
"1h97da"
```

{% hint style="info" %}
**Note:** You can verify that the referrer ID is valid by calling [`growsurf.validateReferrer()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#validate-referrer).
{% endhint %}

***

### Validate referrer

Checks whether a referrer (participant) exists in the program. Returns `true` if the referrer exists, `false` otherwise. Unlike [`getParticipantById()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-participant-by-id), this method needs no participant authentication and returns no participant data.

{% hint style="info" %}
**When to use this:** Use `validateReferrer()` when you need to confirm that a referral link is valid or to check if a participant exists. If you want to add a referred signup only when the referrer is valid, use [`addReferredParticipant()`](#add-referred-participant).
{% endhint %}

```javascript
growsurf.validateReferrer(referrerId, callback);
```

| Parameter        | Data Type | Description                                                                                                                                             |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`referrerId`** | String    | (Optional) The GrowSurf referrer ID to validate. If omitted, the referrer ID is automatically resolved from the `grsf` URL parameter or browser cookie. |
| **`callback`**   | Function  | (Optional) A callback function that will be invoked with `true` if the referrer exists or `false` if the referrer does not exist.                       |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with a [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean). Returns `true` if the referrer exists as a participant in the program, `false` otherwise.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
// Without specifying a referrer ID (auto-detects referrer)
growsurf.validateReferrer(isValid => {
  if (isValid) {
    // Referrer exists
  }
});

// With a specific referrer ID
growsurf.validateReferrer('kafewp', (isValid) => {
  if (isValid) {
    // Referrer exists
  }
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
// Without specifying a participant ID (auto-detects referrer)
growsurf.validateReferrer().then(isValid => {
  if (isValid) {
    // Referrer exists
  }
});

// With a specific participant ID
growsurf.validateReferrer('kafewp').then(isValid => {
  if (isValid) {
    // Referrer exists
  }
});
```

{% endtab %}
{% endtabs %}

#### **Example response**

<pre class="language-javascript"><code class="lang-javascript"><strong>true
</strong></code></pre>

***

## PARTICIPANTS ↓

### Add referred participant

Adds a participant only when the current visitor has a valid referrer. Use this method when you want to track referred signups.

The method validates an explicit `referredBy` value first. If one is not provided, it automatically uses the referrer ID from the `grsf` URL parameter or browser cookie. If no valid referrer is present, no participant is added (see `notAddedReason`).

{% hint style="info" %}
**Tips:** Though they are optional, we recommend passing `firstName` and `lastName`. These fields show up in referred friend motivator elements, if enabled.
{% endhint %}

```javascript
growsurf.addReferredParticipant(data, callback);
```

| Parameter      | Data Type        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data`**     | String or Object | <p>(Required) A String containing the participant email or an Object containing the participant email and any other data to include for the participant.</p><p>If providing an Object, <code>referredBy</code> is optional and will override the automatically detected referrer. Any Object keys other than <code>email</code>, <code>firstName</code>, <code>lastName</code>, <code>referredBy</code>, <code>referredAt</code>, and <code>gdprAgreements</code> will be treated as <a href="/developer-tools/rest-api/api-guidelines.md#metadata"><code>metadata</code></a> by GrowSurf.</p> |
| **`callback`** | Function         | (Optional) A callback function that will be invoked with the result.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with a result object.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
growsurf.addReferredParticipant({
  email: 'gavin@hooli.com',
  firstName: 'Gavin',
  lastName: 'Belson'
}, (result) => {
  if (result.added) {
    // handle result.participant
  }
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
const result = await growsurf.addReferredParticipant({
  email: 'gavin@hooli.com',
  firstName: 'Gavin',
  lastName: 'Belson'
});

if (result.added) {
  // handle result.participant
}
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "added": true,
    "validReferral": true,
    "referredBy": "kafewp",
    "participant": {
        "id": "gavin",
        "firstName": "Gavin",
        "lastName": "Belson",
        "referralCount": 0,
        "monthlyReferralCount": 0,
        "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
        "rewards": [],
        "vanityKeys": [
            "gavin-kafewp"
        ]
    }
}
```

If no participant is added, `notAddedReason` will be one of `no_referrer`, `invalid_referrer`, or `participant_already_exists`.

***

### Add participant

Adds a participant to the referral/affiliate program. Use this method for the following use-cases:

* Add every signup to your GrowSurf program. If a referral link was used, GrowSurf automatically submits the referrer ID behind the scenes.
* Generate referral links for your signed-in users on the fly (or return existing data if they are an existing participant)

For referral-only signup tracking, use [`growsurf.addReferredParticipant()`](#add-referred-participant) instead.

{% hint style="info" %}
**Tips:** Though they are optional, we recommend passing `firstName` and `lastName`. These fields show up in referred friend motivator elements, if enabled.
{% endhint %}

{% hint style="warning" %}
**Note:** Returns `401` if the program uses participant authentication, the browser has no participant cookie, and the given email belongs to an existing participant.
{% endhint %}

```javascript
growsurf.addParticipant(data, callback);
```

| Parameter      | Data Type        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`data`**     | String or Object | <p>(Required) A String containing the participant email or an Object containing the participant email and any other data to include for the participant.</p><p>If providing an Object, any Object keys other than <code>email</code>, <code>firstName</code>, <code>lastName</code> , and <code>gdprAgreements</code> will be treated as <a href="/developer-tools/rest-api/api-guidelines.md#metadata"><code>metadata</code></a> by GrowSurf.<br><br>For more information about metadata please see our <a href="https://docs.growsurf.com/developer-tools/rest-api/api-guidelines">API Guidelines</a>.</p> |
| **`callback`** | Function         | (Optional) A callback function that will be invoked with the added participant data if successful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited participant data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Email only using a Callback
growsurf.addParticipant('gavin@hooli.com', (participant) => {
  // handle participant
});

// Object using a Callback
growsurf.addParticipant({
  email: 'gavin@hooli.com',
  firstName: 'Gavin', // optional participant name
  lastName: 'Belson', // optional participant name
  company: 'Hooli, Inc', // Fields that are not email, firstName, or lastName will be saved as custom metadata
  companySize: 10000 // Fields that are not email, firstName, or lastName will be saved as custom metadata
}, (participant) => {
  // handle participant
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Email only using a Promise
growsurf.addParticipant('gavin@hooli.com').then(participant => {
  // handle participant
});

// Object using a Promise
growsurf.addParticipant({
  email: 'gavin@hooli.com',
  firstName: 'Gavin', // optional participant name
  lastName: 'Belson', // optional participant name
  company: 'Hooli, Inc', // Fields that are not email, firstName, or lastName will be saved as custom metadata
  companySize: 10000 // Fields that are not email, firstName, or lastName will be saved as custom metadata
}).then(participant => {
  // handle participant
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys": [
        "gavin-kafewp"
    ]
}
```

***

### Get participant by email

Retrieves limited details of an existing participant. You will need to supply the unique email of the participant.

{% hint style="warning" %}
**Note:** Returns `403` if the program uses participant authentication and the browser has no participant cookie.
{% endhint %}

```javascript
growsurf.getParticipantByEmail(participantEmail, callback);
```

| Parameter              | Data Type | Description                                                                                                                                   |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`participantEmail`** | String    | (Required) The email of the participant to retrieve.                                                                                          |
| **`callback`**         | Function  | (Optional) A callback function that will be invoked with the participant data if successful or `undefined` if the participant does not exist. |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing the participant data. If the participant does not exist in the program, then `undefined` is returned.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a callback
growsurf.getParticipantByEmail('gavin@hooli.com', (participant) => {
    // Handle participant data
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a promise
growsurf.getParticipantByEmail('gavin@hooli.com').then(participant => {
    // Handle participant data
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys" [
        "gavin-kafewp"
    ]
}
```

***

### Get participant by ID

Retrieves limited details of an existing participant. You will need to supply the GrowSurf unique identifier that was returned upon participant creation.

{% hint style="warning" %}
**Note:** Returns `403` if the program uses participant authentication and the browser has no participant cookie.
{% endhint %}

```javascript
growsurf.getParticipantById(participantId, callback);
```

| Parameter           | Data Type | Description                                                                                                                                   |
| ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`participantId`** | String    | (Required) The GrowSurf identifier of the participant to retrieve.                                                                            |
| **`callback`**      | Function  | (Optional) A callback function that will be invoked with the participant data if successful or `undefined` if the participant does not exist. |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing the participant data. If the participant does not exist in the program, then `undefined` is returned.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getParticipantById('kafewp', (participant) => {
    // Handle participant data
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a promise
growsurf.getParticipantById('kafewp').then(participant => {
    // Handle participant data
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys" [
        "gavin-kafewp"
    ]
}
```

***

## REFERRALS AND INVITES ↓

### Update social share message

Updates the pre-populated social share message for the given share type (e.g, email, Facebook, Twitter). This method will update all social share buttons in GrowSurf embedded elements and the GrowSurf window.

{% hint style="info" %}
**Example:** This method is useful for optimizing referral asks when your participants complete an "[aha moment](https://userguiding.com/blog/what-is-aha-moment-how-to-find-it/)". You would present your participant with the [GrowSurf Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) element and then call this method to update social share message(s) to be specific to the "aha moment". See [this tutorial](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-9-update-pre-populated-share-and-email-invite-messages-to-capitalize-on-a-customer-aha-momen) for an example.
{% endhint %}

```javascript
growsurf.updateSocialShareMessage(type, message, subjectLine);
```

| Parameter         | Data Type | Description                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`type`**        | String    | <p>(Required) The social share type to update.</p><p><br>These are the options:</p><ul><li><code>email</code></li><li><code>facebook</code></li><li><code>twitter</code></li><li><code>threads</code></li><li><code>bluesky</code></li><li><code>pinterest</code></li><li><code>sms</code></li><li><code>whatsapp</code></li><li><code>reddit</code></li><li><code>tumblr</code></li></ul> |
| **`message`**     | String    | <p>(Required) The new pre-populated social share message.</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p>                                                                                                                                                                                                                                        |
| **`subjectLine`** | String    | <p>(Optional) The new pre-populated subject line (only applies when <code>type</code> is <code>email</code>).</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p>                                                                                                                                                                                    |

#### **Example use**

```javascript
const message = "I have saved 1,540 hours using this service. Highly recommend! {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the pre-populated email social share message
growsurf.updateSocialShareMessage('email', message, subjectLine);

// Update the pre-populated Facebook social share message
growsurf.updateSocialShareMessage('facebook', message);

// Update the pre-populated Twitter social share message
growsurf.updateSocialShareMessage('twitter', message);

// Update the pre-populated Threads social share message
growsurf.updateSocialShareMessage('threads', message);

// Update the pre-populated Bluesky social share message
growsurf.updateSocialShareMessage('bluesky', message);

// Update the pre-populated Pinterest social share message
growsurf.updateSocialShareMessage('pinterest', message);

// Update the pre-populated SMS social share message
growsurf.updateSocialShareMessage('sms', message);

// Update the pre-populated WhatsApp social share message
growsurf.updateSocialShareMessage('whatsapp', message);

// Update the pre-populated Reddit social share message
growsurf.updateSocialShareMessage('reddit', message);

// Update the pre-populated Tumblr social share message
growsurf.updateSocialShareMessage('tumblr', message);
```

***

### Update email invite message

Updates the pre-populated email invite message. This method will only apply updates to [GrowSurf Embedded Invite](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-invite) elements (the email invite section within the GrowSurf window will not be updated).

{% hint style="info" %}
**Example:** This method is useful for optimizing referral asks when your participants complete an "[aha moment](https://userguiding.com/blog/what-is-aha-moment-how-to-find-it/)". You would present your participant with the [GrowSurf Embedded Invite](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-invite) element and then call this method to update the email invite message to be specific to the "aha moment". See [this tutorial](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-9-update-pre-populated-share-and-email-invite-messages-to-capitalize-on-a-customer-aha-momen) for an example.
{% endhint %}

```javascript
growsurf.updateEmailInviteMessage(message, subjectLine);
```

| Parameter         | Data Type | Description                                                                                                                                         |
| ----------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`message`**     | String    | <p>(Required) The new pre-populated email invite message.</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p> |
| **`subjectLine`** | String    | <p>(Optional) The new pre-populated subject line.</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p>         |

#### **Example use**

```javascript
const message = "I have saved 1,540 hours using this service. Highly recommend! {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the pre-populated email invite message and subject line
growsurf.updateEmailInviteMessage(message, subjectLine);
```

***

## REFERRAL PROGRAMS ↓

### Trigger referral

<mark style="color:orange;">Referral programs only</mark>

Triggers a referral, awarding referral credit to the referrer of an existing or new participant. If the program participant does not exist, they will be newly added.

{% hint style="warning" %}
**Note:** Returns `401`, but still triggers the referral, if the program uses participant authentication, the browser has no participant cookie, and the given email belongs to an existing participant.
{% endhint %}

```javascript
growsurf.triggerReferral(data, callback);
```

| Parameter      | Data Type        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data`**     | String or Object | <p>(Optional) A String containing the participant email or an Object containing the participant email and any other data to include for the participant.</p><p>If providing an Object, any Object keys other than <code>email</code>, <code>firstName</code>, and <code>lastName</code> will be treated as <a href="/developer-tools/rest-api/api-guidelines.md#metadata"><code>metadata</code></a> by GrowSurf.</p><p><em>\*This parameter is only optional if the participant has already signed up for the program and GrowSurf is able to determine they are a participant (does not include participants imported or manually added using the dashboard). For more information about metadata please see our</em> <a href="/developer-tools/rest-api/api-guidelines.md#metadata"><em>API Guidelines</em></a><em>.</em></p> |
| **`callback`** | Function         | (Optional) A callback function that will be invoked with the added or updated participant data if successful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited participant data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Email only using a Callback
growsurf.triggerReferral('gavin@hooli.com', (participant) => {
  // handle participant
});

// Object using a Callback
growsurf.triggerReferral({
  email: 'gavin@hooli.com',
  firstName: 'Gavin', // optional participant name
  lastName: 'Belson', // optional participant name
  company: 'Hooli, Inc', // Fields that are not email, firstName, or lastName will be saved as custom metadata
  companySize: 10000 // Fields that are not email, firstName, or lastName will be saved as custom metadata
}, (participant) => {
  // handle participant
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Email only using a Promise
growsurf.triggerReferral('gavin@hooli.com').then(participant => {
  // handle participant
});

// Object using a Promise
growsurf.triggerReferral({
  email: 'gavin@hooli.com',
  firstName: 'Gavin',
  lastName: 'Belson',
  company: 'Hooli, Inc',
  companySize: 10000
}).then(participant => {
  // handle participant
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys" [
        "gavin-kafewp"
    ]
}
```

***

### Get upfront discount

<mark style="color:orange;">Referral programs only</mark>

Use this method when you want to apply an upfront discount to a referred friend (e.g., "Get 20% off your first invoice").

Returns the upfront discount promotion code and coupon ID for the current referred visitor. Returns `null` if the visitor was not referred, if no upfront discount is enabled, or if the program has ended.

{% hint style="warning" %}
**Note:** The upfront discount must be enabled on a Double-Sided reward (via the "Give the referred friend their reward upfront instead of after they complete the qualifying action" toggle) and a coupon integration ([Stripe](https://docs.growsurf.com/integrations/stripe#upfront-discounts), [Chargebee](https://docs.growsurf.com/integrations/chargebee#upfront-discounts), or [Recurly](https://docs.growsurf.com/integrations/recurly#upfront-discounts)) must be connected with referred friend coupon settings. The visitor must have been referred (i.e., arrived via a referral link) for a discount to be returned.
{% endhint %}

| Parameter         | Data Type | Description                                                                                                                                    |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `integrationType` | String    | (Optional) One of `'stripe'`, `'chargebee'`, or `'recurly'`. If omitted, returns the first available upfront discount across all integrations. |

Returns an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics) or `null`.

#### Example use

```js
// Get the first available upfront discount
const discount = window.growsurf.getUpfrontDiscount();

// Get Stripe-specific upfront discount
const stripeDiscount = window.growsurf.getUpfrontDiscount('stripe');

// Get Chargebee-specific upfront discount
const chargebeeDiscount = window.growsurf.getUpfrontDiscount('chargebee');

if (discount) {
  // Apply the promotion code to your checkout flow
  applyDiscount(discount.promotionCode);
}
```

#### Example response

```js
{
  integration: 'stripe',          // Which integration the discount is from
  promotionCode: 'GRSF-A1B2C3D4', // Customer-facing code
  couponId: 'coupon_abc123'       // Provider coupon ID
}
```

***

### Get referral summary

<mark style="color:orange;">Referral programs only</mark>

Returns referral summary statistics for the currently logged-in participant.

{% hint style="warning" %}
**Note:** Returns `401` if the program uses participant authentication and the browser has no participant cookie.
{% endhint %}

```javascript
growsurf.getReferralSummary();
```

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics) containing the participant's referral summary stats.

#### Example use

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getReferralSummary({}, (summary) => {
  console.log('Referral Summary:', summary);
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
const summary = await growsurf.getReferralSummary();
console.log(summary);
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
  "referrals": 23,         // Number of successful referrals
  "leads": 45,             // Number of pending referrals (leads)
  "expiredReferrals": 3,   // Number of referrals that expired before being credited
  "clicks": 23000,         // Number of unique visitors from the participant's referral link
  "rewardsEarned": 4,      // Number of rewards the participant has earned (approved)
  "pendingRewards": 1,     // Number of rewards still waiting to be approved (not yet earned)
  "invitesSent": 12,       // Number of email invites the participant has sent through GrowSurf
  "currencyISO": "USD"     // The ISO 4217 currency code of the campaign
}
```

***

## AFFILIATE PROGRAMS ↓

### Get commissions

<mark style="color:orange;">Affiliate programs only</mark>

Returns a paginated list of commissions for the logged-in participant.

{% hint style="warning" %}
**Note:** Returns `401` if the program uses participant authentication and the browser has no participant cookie.
{% endhint %}

```javascript
growsurf.getCommissions(options, callback);
```

| Parameter            | Data Type | Description                                                                                                                                                                                                                                                          |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`options`**        | Object    | (Optional) An object containing pagination options.                                                                                                                                                                                                                  |
| **`options.limit`**  | Number    | (Optional) The number of commissions to return per page. Defaults to 20.                                                                                                                                                                                             |
| **`options.nextId`** | String    | (Optional) The ID of the commission to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a `nextId` value if there are more commissions otherwise the `nextId` value will be `null`. |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited commissions data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback - First page
growsurf.getCommissions({ limit: 10 }, (result) => {
  console.log(result.commissions); // Array of commission objects
  console.log(result.summary); // Summary of commissions by status
  console.log(result.hasMore); // Boolean indicating if more results are available
  console.log(result.nextId); // Cursor ID for next page (undefined if no more results)
});

// Fetching the next page
growsurf.getCommissions({ limit: 10, nextId: 'comm_abc123' }, (result) => {
  console.log(result.commissions); // Next page of results
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise - First page
const result = await growsurf.getCommissions({ limit: 10 });
console.log(result.commissions); // Array of commission objects
console.log(result.summary); // Summary of commissions by status

// Fetching additional pages
if (result.hasMore) {
  const nextPage = await growsurf.getCommissions({ limit: 10, nextId: result.nextId });
  console.log(nextPage.commissions); // Next page of results
}
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
  "commissions": [
    {
      "id": "comm_t1so1w",
      "amount": 7228,
      "currencyISO": "USD",
      "status": "PENDING",
      "holdDuration": 0,
      "createdAt": 1764768074294,
      "amountInCampaignCurrency": 7228,
      "saleAmountInCampaignCurrency": 38900,
      "campaignCurrencyISO": "USD"
    }
  ],
  "summary": {
    "pending": {
      "count": 1,
      "totalAmount": 7228
    },
    "approved": {
      "count": 0,
      "totalAmount": 0
    },
    "paid": {
      "count": 0,
      "totalAmount": 0
    },
    "reversed": {
      "count": 0,
      "totalAmount": 0
    }
  },
  "totalCount": 1,
  "totalAmount": 7228,
  "nextId": "comm_def456",
  "hasMore": true
}
```

***

### Get payouts

<mark style="color:orange;">Affiliate programs only</mark>

Returns a paginated list of payouts for the logged-in participant.

{% hint style="warning" %}
**Note:** Returns `401` if the program uses participant authentication and the browser has no participant cookie.
{% endhint %}

```javascript
growsurf.getPayouts(options, callback);
```

| Parameter            | Data Type | Description                                                                                                                                                                                                                                                  |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`options`**        | Object    | (Optional) An object containing pagination options.                                                                                                                                                                                                          |
| **`options.limit`**  | Number    | (Optional) The number of payouts to return per page. Defaults to 20.                                                                                                                                                                                         |
| **`options.nextId`** | String    | (Optional) The ID of the payout to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a `nextId` value if there are more payouts otherwise the `nextId` value will be `null`. |

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited payouts data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback - First page
growsurf.getPayouts({ limit: 10 }, (result) => {
  console.log(result.payouts); // Array of payout objects
  console.log(result.summary); // Summary of payouts by status
  console.log(result.hasMore); // Boolean indicating if more results are available
  console.log(result.nextId); // Cursor ID for next page (undefined if no more results)
});

// Fetching the next page
growsurf.getPayouts({ limit: 10, nextId: 'payout_xyz' }, (result) => {
  console.log(result.payouts); // Next page of results
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise - First page
const result = await growsurf.getPayouts({ limit: 10 });
console.log(result.payouts); // Array of payout objects
console.log(result.summary); // Summary of commissions by status

// Fetching additional pages
if (result.hasMore) {
  const nextPage = await growsurf.getPayouts({ limit: 10, nextId: result.nextId });
  console.log(nextPage.payouts); // Next page of results
}
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
	"payouts": [
		{
			"id": "po_kj19ss",
			"amount": 91212,
			"currencyISO": "USD",
			"status": "UPCOMING",
			"createdAt": 1763974665314,
			"amountInCampaignCurrency": 91212,
			"campaignCurrencyISO": "USD"
		},
		{
			"id": "po_asaj1s",
			"amount": 89120,
			"currencyISO": "USD",
			"status": "ISSUED",
			"paymentMethod": "PAYPAL",
			"createdAt": 1763974665314,
			"amountInCampaignCurrency": 89120,
			"campaignCurrencyISO": "USD"
		}
	],
  "summary": {
    "upcoming": {
      "count": 1,
      "totalAmount": 91212
    },
    "queued": {
      "count": 0,
      "totalAmount": 0
    },
    "issued": {
      "count": 1,
      "totalAmount": 89120
    }
  },
	"totalCount": 2,
	"totalAmount": 180332,
	"nextId": "po_x99s1o",
	"hasMore": true
}
```

Once a payout has been paid, it includes a `paymentMethod` showing how it was sent: `PAYPAL`, `WISE`, `ACH`, `WIRE`, `CHECK`, `GIFT_CARD`, `CARD`, `WALLET`, or `OTHER`. Payouts that have not been paid yet return `paymentMethod: null`.

***

### Get affiliate summary

<mark style="color:orange;">Affiliate programs only</mark>

Returns affiliate summary statistics for the currently logged-in participant.

{% hint style="warning" %}
**Note:** Returns `401` if the program uses participant authentication and the browser has no participant cookie.
{% endhint %}

```javascript
growsurf.getAffiliateSummary();
```

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing the participant's affiliate summary stats.

#### Example use

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getAffiliateSummary({}, (summary) => {
  console.log('Affiliate Summary:', summary);
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
const summary = await growsurf.getAffiliateSummary();
console.log(summary);
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
  "referralRevenue": 2500000, // Total revenue generated from referrals (in minor currency units, e.g., cents)
  "totalPaidOut": 1500000, // Total commissions paid out to the affiliate (in minor currency units)
  "upcomingPayout": 500000, // Pending commissions to be paid out (in minor currency units)
  "referrals": 23, // Number of successful referrals
  "leads": 45, // Number of pending referrals (leads)
  "clicks": 23000, // Number of unique visitors from the affiliate's referral link (aka unique impressions)
  "currencyISO": "USD" // The ISO 4217 currency code of the campaign (e.g., "USD")
}
```

***

## NOTIFICATIONS ↓

### Initialize unread notifications badge

This method will inject an unread notifications badge onto a target element.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FWwlQlVwMz4XeEV1IqpyN%2Fimage.png?alt=media&amp;token=291e93a1-621f-4d76-979b-2142898e712e" alt=""><figcaption><p>The unread badge will be injected into your target element</p></figcaption></figure>

This method is useful for highlighting an unread notifications badge to your users from within your own user portal.

We recommend that the target element be a button that opens the GrowSurf window (via [`growsurf.open()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#open-growsurf-window)), because the unread notifications badge will be cleared when the participant views the respective section in the GrowSurf window (rewards section for referral programs; commissions or payouts sections for affiliate programs).

{% hint style="info" %}
Alternatively, you can use [`growsurf.markNotificationsAsRead()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#mark-notifications-as-read) to clear the unread notifications badge.
{% endhint %}

If a participant cookie doesn't exist, the badge will not be displayed on the target element.

```javascript
growsurf.initUnreadNotificationsBadge(targetElement, type);
```

<table><thead><tr><th width="249.33333333333331">Parameter</th><th>Data Type</th><th>Description</th></tr></thead><tbody><tr><td><strong><code>targetElement</code></strong></td><td>String</td><td><p>(Required) The target element</p><p><br>Example: <code>.my-button</code></p></td></tr><tr><td><strong><code>type</code></strong></td><td>String</td><td>(Optional) Available options:<br><br><code>rewards</code><br><code>commissions</code><br><code>payouts</code><br><br>If no <code>type</code> is provided, then all unread notification badges will be initialized.</td></tr></tbody></table>

#### **Example use**

```html
<a class="my-button">
  Refer and Earn
</a>

<script>
  growsurf.initUnreadNotificationsBadge('.my-button');
</script>
```

{% hint style="success" %}

#### **CSS Alternative:**

Instead of using the JavaScript method `growsurf.initUnreadNotificationsBadge()`, you can add a CSS class `growsurf-unread-notifications-badge` to your target element. This will also inject the unread badge without requiring JavaScript.\
\
**Here is an example:**

```html
<a href="/refer"
   class="my-button growsurf-unread-notifications-badge">
  Refer and Earn
</a>
```

**Note:** You'll need to make sure you have the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) installed.
{% endhint %}

{% hint style="danger" %}
**Important Note**: Notification counts will not appear if you have certain sections disabled within the *Program Editor > 2. Design > Rewards* section. For example:

* For referral programs, if you have the rewards section hidden (see image below), the notification counts will not appear.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2Fm9j9jqr4g09QlH8b020V%2FCampaign%20Editor%20-%20Design%20(Campaign%20pnh44u)%202025-12-11%20at%204.46.23%20PM.png?alt=media&amp;token=086a1b48-3c79-454a-9bbc-719b29faa5f4" alt="" width="375"><figcaption></figcaption></figure></div>
* For affiliate programs, if you have the commissions or payouts sections hidden (see image below), the notification counts will only reflect the sections that are enabled.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FZiuJ0b5tZo5Xw3cG7I6V%2FCampaign%20Editor%20-%20Design%20(Campaign%20duxyl4)%202025-12-11%20at%204.43.55%20PM.png?alt=media&amp;token=018e7721-dc90-47ce-83a2-61569a561dd1" alt="" width="375"><figcaption></figcaption></figure></div>

{% endhint %}

***

### Get unread notifications count

Returns the number of unread notifications (rewards for referral programs; commissions and payouts for affiliate programs) of the authenticated participant or **`null`** if there is no participant authentication cookie present. This method is useful for highlighting an unread notifications badge to your users from within your own user portal.

{% hint style="info" %}
Alternatively, you can use the [`growsurf.initUnreadNotificationsBadge()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-unread-notifications-badge) method for displaying the unread notifications count as a badge on a target element.
{% endhint %}

<table><thead><tr><th width="249.33333333333331">Parameter</th><th>Data Type</th><th>Description</th></tr></thead><tbody><tr><td><strong><code>type</code></strong></td><td>String</td><td>(Optional) Available options:<br><br><code>rewards</code><br><code>commissions</code><br><code>payouts</code><br><br>If no <code>type</code> is provided, then all unread notification counts will be returned.</td></tr></tbody></table>

```javascript
growsurf.getUnreadNotificationsCount(type);
```

#### **Example use**

```javascript
growsurf.getUnreadNotificationsCount('rewards');
```

**Example response**

```javascript
2
```

{% hint style="danger" %}
**Important Note**: Notification counts will not appear if you have certain sections disabled within the *Program Editor > 2. Design > Rewards* section. For example:

* For referral programs, if you have the rewards section hidden (see image below), the notification counts will not appear.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2Fm9j9jqr4g09QlH8b020V%2FCampaign%20Editor%20-%20Design%20(Campaign%20pnh44u)%202025-12-11%20at%204.46.23%20PM.png?alt=media&amp;token=086a1b48-3c79-454a-9bbc-719b29faa5f4" alt="" width="375"><figcaption></figcaption></figure></div>
* For affiliate programs, if you have the commissions or payouts sections hidden (see image below), the notification counts will only reflect the sections that are enabled.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FZiuJ0b5tZo5Xw3cG7I6V%2FCampaign%20Editor%20-%20Design%20(Campaign%20duxyl4)%202025-12-11%20at%204.43.55%20PM.png?alt=media&amp;token=018e7721-dc90-47ce-83a2-61569a561dd1" alt="" width="375"><figcaption></figcaption></figure></div>

{% endhint %}

***

### Mark notifications as read

Mark unread notifications of the authenticated participant. This method is useful if you are using [`growsurf.initUnreadNotificationsBadge()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-unread-notifications-badge) instead of the GrowSurf window to show your users their unread notifications count and want to clear out the unread badge.

```javascript
growsurf.markNotificationsAsRead(type);
```

<table><thead><tr><th width="249.33333333333331">Parameter</th><th>Data Type</th><th>Description</th></tr></thead><tbody><tr><td><strong><code>type</code></strong></td><td>String</td><td>(Optional) Available options:<br><br><code>rewards</code><br><code>commissions</code><br><code>payouts</code><br><br>If no <code>type</code> is provided, then all unread notifications will be marked as read.</td></tr></tbody></table>

Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) that resolves with an [Object](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)with a success response.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.markNotificationsAsRead(response => {
  // handle success response
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.markNotificationsAsRead().then(response => {
  // handle success response
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "success": true
}
```

***

## EVENTS ↓

### Subscribe to event

Adds an event subscription of the given event type. When an event of the given type occurs, the given callback will be invoked. Below are detailed descriptions of each event type.

```javascript
growsurf.subscribe(eventType, callback);
```

| Parameter       | Data Type | Description                                                                                                                                                                                                                                       |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`eventType`** | String    | <p>(Required) The event type to subscribe to.</p><p><br>These are the options:</p><ul><li><code>referral</code></li><li><code>referralTrigger</code></li><li><code>signup</code></li><li><code>share</code></li><li><code>invite</code></li></ul> |
| **`callback`**  | Function  | The callback function that will be invoked when the event occurs.                                                                                                                                                                                 |

#### **Example use**

```javascript
/**
 * REFERRED FRIEND EVENTS
 */

// Subscribe to a `referral` event type
growsurf.subscribe('referral', (participant) => {
  // A new participant was referred
});

// Subscribe to a `referralTrigger` event type
growsurf.subscribe('referralTrigger', (participant) => {
  // A referred participant triggered a referral (AKA they completed the qualifying action)
});


/**
 * REFERRER EVENTS
 */

// Subscribe to a `signup` event type
growsurf.subscribe('signup', (participant) => {
  // A new participant was added (only non-referred signups)
});

// Subscribe to a `share` event type
growsurf.subscribe('share', (data) => {
  // A participant shared their unique referral URL by clicking a social share button
});

// Subscribe to an `invite` event type
growsurf.subscribe('invite', (participant) => {
  // A participant sent out an invite
});
```

#### **Example response**

Dispatched anytime an event happens. The provided callback will be invoked with an Object containing data relevant to the event.

{% tabs %}
{% tab title="" %}
The `'referral'` event returns limited data of the new referred participant. The `referredBy` key represents the referring participant's unique ID.

```json
{
    "id": "kafewp",
    "email": "gavin@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referredBy": "xyz789",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=kafewp",
    "rewards": [],
    "campaign": {
       "id": "abc123"
    }
}
```

{% endtab %}

{% tab title="" %}
The `'referralTrigger'` Event returns limited data of the referred participant that triggered a referral (which means they completed a qualifying action).

**Note:** This event happens when calling [`growsurf.triggerReferral()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#trigger-referral). If you are looking for the referred signup event, use the 'referral' Event that contains a `referredBy` property.

```json
{
    "id": "kafewp",
    "email": "gavin@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=kafewp",
    "rewards": [],
    "campaign": {
       "id": "abc123"
    }
}
```

{% endtab %}

{% tab title="" %}
The `'signup'` Event returns limited data of the new non-referred participant.

```json
{
    "id": "kafewp",
    "email": "gavin@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=kafewp",
    "rewards": [],
    "campaign": {
       "id": "abc123"
    }
}
```

{% endtab %}

{% tab title="" %}
The `'share'` Event returns limited data of the participant and the share type.

The `shareType` value will either be a social network (e.g., `linkedin`, `reddit`) or `copyLink` if the participant copied their link to share (e.g., they clicked "Copy Link").

```json
{
    "participant": {
        "id": "kafewp",
        "email": "gavin@hooli.com",
        "firstName": "Gavin",
        "lastName": "Belson",
        "referralCount": 0,
        "shareUrl": "https://piedpiper.com?grsf=kafewp",
        "rewards": []
    },
    "shareType": "facebook",
    "campaign": {
       "id": "abc123"
    }
}
```

{% endtab %}

{% tab title="" %}
The `'invite'` Event returns limited data of the participant and the number of invites sent.<br>

If your program is set up for email invites to be sent by participants, `invitesAttempted` will always match `invitesSent`. If email invites are sent by your company, `invitesSent` will only count successfully delivered emails confirmed by our server. [Learn more here](https://support.growsurf.com/article/353-how-email-invites-work).

```json
{
    "participant": {
        "id": "kafewp",
        "email": "gavin@hooli.com",
        "firstName": "Gavin",
        "lastName": "Belson",
        "referralCount": 0,
        "shareUrl": "https://piedpiper.com?grsf=kafewp",
        "rewards": []
    },
    "invitesAttempted": 3,
    "invitesSent": 3,
    "campaign": {
       "id": "abc123"
    }
}
```

{% endtab %}
{% endtabs %}


# Client Response Codes

Use these codes to troubleshoot errors when using the JavaScript SDK or Embeddable Elements.

## Glossary

| **Response Code**                | **Messages**                                                                                                                                                         | **Explanation**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200 OK`                         | The request was successful!                                                                                                                                          | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `400 Bad Request`                | Participant cannot join this program.                                                                                                                                | The participant was prevented from being added to the program (please check that your program's anti-fraud settings are not set to *Strict*, or that you do not have the email or IP address blacklisted)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `401 Unauthorized`               | Participant authentication is required.                                                                                                                              | If an existing participant is trying to access their account, they need to first authenticate (by logging in via one-time access token link in email)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `401 Failed to add participant`  | Participant was not able to join this program.                                                                                                                       | The person may be a high-risk fraudster, and has been blocked from entering the program. [Learn more about how GrowSurf's anti-fraud system works](https://support.growsurf.com/article/195-what-does-the-growsurf-anti-fraud-system-entail).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `402`                            | Usage limit exceeded                                                                                                                                                 | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `403 Forbidden`                  | <ol><li>You are not allowed to perform that action.</li><li>No valid participant access token provided.</li><li>Request was blocked (includes CORS issues)</li></ol> | <ol><li>This may be due to the URL not matching what is configured for your program. Make sure to check your whitelisted URLs as well. Any URLs that makes excessive unauthorized requests to your GrowSurf program may be blocked. Please reach out to <support@growsurf.com> for assistance.</li><li>If an existing participant is trying to access their account, they need to first authenticate (by logging in via one-time access token link in email)</li><li>Your program may be blocked due to excessive requests made to our system from the same IP address. Please see <a href="https://support.growsurf.com/article/483-i-am-having-cors-issues-when-loading-the-growsurf-universal-code">this article</a>.</li></ol> |
| `404 Resource Not Found`         | The requested resource does not exist.                                                                                                                               | You may be trying to request a resource that does not exist or was deleted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `409 Conflict Duplicate Request` | Conflicting duplicate request.                                                                                                                                       | <p>The same request was sent again before the first one finished.</p><p>More details on the specific request will be provided within the returned error.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `429 Too Many Requests`          | You have reached your \<rate> limit                                                                                                                                  | You have reached the rate limit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `5XX Internal Server Error`      | The GrowSurf server is inaccessible or offline. That's our fault! Check for updates on our [status page](https://growsurf.com/status).                               | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
