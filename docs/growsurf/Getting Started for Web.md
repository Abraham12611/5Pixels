# Getting Started for Web

For web integration, start here once you've created your GrowSurf program.

Want AI help before you install GrowSurf? See [Build with AI](/build-with-ai.md). An AI assistant that can take actions for you can create a draft program for you to review. When the draft is ready, return here to install it on your website.

Setting up a referral program? Follow [Referral Program Workflow](/getting-started/referral-program-workflow.md) to track referrals, record the action that counts, and approve and send rewards.

Setting up an affiliate program? Follow [Affiliate Program Workflow](/getting-started/affiliate-program-workflow.md) to connect referral tracking, commissions, refund handling, and payouts.

{% hint style="info" %}
**Sandbox/testing environment**

To start building your referral or affiliate program in a "sandbox" environment, we recommend creating two separate GrowSurf programs (one for development and one for production).

In the API and code, a program is called a campaign. Every GrowSurf program has a unique ID that you can find in the URL or from the program's GrowSurf Universal Code. [Learn more here](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
{% endhint %}

## Step 1: Install the GrowSurf Universal Code onto your site

#### Get the GrowSurf Universal Code.

The *GrowSurf Universal Code* is what allows referrals to be tracked and credited properly.

It also shows the GrowSurf window and embeddable elements, where participants get their share link, share, and check their stats or the leaderboard.

The GrowSurf Universal Code is a snippet of JavaScript that you paste into the \<HEAD> of your website.

To get your program-specific GrowSurf Universal Code, follow the *Installation* steps in the *Program Editor* until you get to the instructions page (see image below).

![Find your program-specific GrowSurf Universal Code in the Installation step of the Program Editor](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfJtVOuiBb7Hj-PgFoL%2F-LfJyLczHVfm3nA0KajL%2FScreen%20Shot%20on%202019-05-20%20at%2019%3A21%3A04.png?alt=media\&token=e97f03e0-df10-4f80-bca9-f8d62d7c5c42)

{% hint style="info" %}
**Note:**

* Your program-specific GrowSurf Universal Code will work on any URL that shares the same origin ([what's same-origin?](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)) as the *Share URL* or *Signup URL* that you entered in the *Installation* step of the *Program Editor*. [Click here for image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfUACx31pyQJHxsgdvN%2F-LfUAF1aWVBnBJ5YshXz%2FScreen%20Shot%20on%202019-05-22%20at%2018%3A53%3A26.png?alt=media\&token=0ae62744-aa53-44d8-ab40-2a1d2bae4132)
* If you have *Participant authentication/login* enabled, you may want to set up [*Participant Auto Authentication*](/getting-started/participant-auto-authentication.md)*.*
* To set up a development process that supports multiple environments (e.g, development, production), [view this article](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
  {% endhint %}

## Step 2: Connect integrations or use the GrowSurf API

GrowSurf provides no-code [integrations](https://growsurf.com/integrations/) (such as Stripe, HubSpot, Salesforce) to track when referred leads successfully convert. You can also use our web/mobile SDKs or REST API to integrate with GrowSurf.

| Development Tool                                         | Type        | Description                                                                                                       |
| -------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| [**JavaScript SDK**](/developer-tools/javascript-sdk.md) | Client-side | Open/close the GrowSurf window, generate referral links, track referral attribution.                              |
| [**iOS SDK**](/developer-tools/ios-sdk.md)               | Client-side | Open/close the GrowSurf window, generate referral links, track referral attribution.                              |
| [**Android SDK**](/developer-tools/android-sdk.md)       | Client-side | Open/close the GrowSurf window, generate referral links, track referral attribution.                              |
| [**REST API**](/developer-tools/rest-api.md)             | Server-side | Create new participants, trigger referrals, get program data, and get participant data from a secure environment. |

## Step 3: Send rewards automatically

Send rewards and sync data automatically by using an [integration](https://growsurf.com/integrations) or by using [Webhooks](/developer-tools/webhooks.md).

## Step 4: Open the GrowSurf window

The GrowSurf window is a widget that opens from within your product. It is the central command center for your program participants to share their unique link, send invites, and track the status of their referrals. It is branded, customizable, and available via web and mobile SDKs.

![](https://d33v4339jhl8k0.cloudfront.net/docs/assets/524448053e3e9bd67a3dc68a/images/52b3179ce4b0a3b4e5ec6393/file-kPc7JvfiR4.png)

{% embed url="<https://youtu.be/ESlkP4k0ksc>" %}

***

## Troubleshooting

To troubleshoot common issues during installation, check out [Help Center - Installation](https://support.growsurf.com/category/232-troubleshooting) articles or [contact GrowSurf support](https://app.growsurf.com/settings#contact_support).



# Referral Program Workflow

Follow a referred friend from a shared link through signup, the action that counts, and reward approval and delivery.

GrowSurf tracks who referred each new customer and unlocks rewards when the goals you set are reached. This guide explains when referrals count, who confirms the action, and how rewards are approved and sent.

![How a referred friend moves from a referral link to earning a reward](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2Fgit-blob-1e799a8cfb47a8b58ff7d267594f4df31b062911%2Freferral-program-workflow-diagram.svg?alt=media)

Before you invite participants, use the Program Editor to configure your referral trigger, rewards, who gets rewarded, and whether rewards require approval.

## 1. Give each participant their referral link

You can provide participants with their referral link through the [referral widget](/developer-tools/javascript-sdk/tutorials.md#example-2-open-growsurf-window-on-button-click), [embedded form](/developer-tools/embeddable-elements.md#embedded-form), or a hosted referral portal.

For an iOS or Android app, follow [Getting Started for Native Mobile](https://docs.growsurf.com/getting-started-for-native-mobile) to add the referral widget to your app. Participants can then view and share their referral link and track their referrals and rewards.

## 2. Keep track of who referred the friend

When a referred friend signs up, GrowSurf needs to record who referred them. If you're using the Automagic form tracking method, verify that referral tracking is working correctly.

For forms that aren't compatible with Automagic form tracking, use the [JavaScript SDK](/developer-tools/javascript-sdk.md) or follow the [REST API](/developer-tools/rest-api.md) tutorial. When adding the new user with the REST API, include `referredBy` to associate the new user with a referrer. It can be the referrer's email address or unique GrowSurf ID. You can use [`growsurf.getReferrerId()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-referrer-id) to retrieve the referrer ID.

For iOS and Android apps, install the [iOS](/developer-tools/ios-sdk.md) or [Android SDK](/developer-tools/android-sdk.md) to capture referral attribution, create referred participants, and show a native referral window in your app.

## 3. Record the action that counts

Your program's referral trigger determines when the referrer receives credit:

| Referral trigger            | How to record it                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Signup                      | Configure your program to award referral credit on signup, then follow the signup flow for your integration.            |
| Sign Up + Qualifying Action | Configure your program to award referral credit after a qualifying action, such as making a purchase or booking a demo. |

### Choose an action your team can confirm

For a referral that counts only after a later action, connect a supported integration or have your backend confirm the action through the [REST API tutorial](/developer-tools/rest-api/tutorials.md). Signing up and completing that action are separate steps.

These are examples to adapt to your program, not built-in industry checks:

| Business                                                               | Example action that counts                                 | Who confirms it                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| [SaaS](https://growsurf.com/for/saas/)                                 | A first subscription payment                               | Your connected payment platform or your backend                           |
| [Consumer fintech](https://growsurf.com/for/financial-services/)       | A first deposit or completed transfer                      | Your backend, after your team's required checks                           |
| [Insurance](https://growsurf.com/for/insurance/)                       | A referred lead meets your program's criteria              | Your CRM or your team; policy and cancellation checks stay in your system |
| [Telehealth](https://growsurf.com/for/telehealth/)                     | A referred customer completes the action your team chose   | Your connected tools or your backend                                      |
| [Provider recruitment](https://growsurf.com/for/provider-recruitment/) | A referred provider completes your onboarding requirements | Your recruitment team or system, including any credential checks          |

Choose the action and reward rules before connecting your tools. GrowSurf counts the referral from the confirmation you send; your team owns the business checks behind it. For commissions on partner-referred sales, follow the [affiliate program workflow](/getting-started/affiliate-program-workflow.md).

## 4. Unlock and approve rewards

Referral credit counts toward your program's reward goals, and a reward unlocks when the applicable goal is reached. If you offer an [upfront discount](/integrations/stripe.md#upfront-discounts), the referred friend can receive their coupon before completing the qualifying action.

Choose how rewards are approved:

* **Manually approve rewards.** Review the participant's activity and pending reward in the dashboard before approving the reward and marking it as fulfilled. You can enable the New Participant Reward email notification to know when a reward is ready for review.
* **Automatically approve rewards.** When a participant unlocks a reward, GrowSurf automatically approves it. You can then manually mark the reward as fulfilled to keep track of which rewards have been issued.
* **Automatically approve & mark as fulfilled.** When a participant unlocks a reward, GrowSurf automatically approves it and marks it as fulfilled.

## 5. Deliver rewards and show participants their progress

Once a reward is approved, GrowSurf issues it using the integration connected to that reward. You can deliver gift cards through [Tango Card](/integrations/tango-card.md) or [Tremendous](/integrations/tremendous.md), coupons or credits through [Stripe](/integrations/stripe.md#coupons-credits), and payouts with [PayPal](/integrations/paypal.md#payouts) or [webhooks](/developer-tools/webhooks.md). Follow the selected integration's setup instructions, including recipient settings and any funding requirements.

Use webhooks when you want your application to send rewards. For example, when a participant reaches a goal, your backend can use the [`PARTICIPANT_REACHED_A_GOAL`](/developer-tools/webhooks/events-reference.md#participant_reached_a_goal) event to trigger your own reward logic, such as adding points to a user’s account or creating a reward in your system.

After a reward is issued, participants can check their referrals and rewards through the referral widget, the [embedded referral progress](/developer-tools/embeddable-elements.md#embedded-referral-status) or [earned rewards elements](/developer-tools/embeddable-elements.md#embedded-rewards), or your program's referral portal. Place the widget or elements in your customer dashboard.

## Check the journey before launch

Create a separate development program to test your referral flow before going live. This keeps test participants and integration activity separate from your production program. If you're testing an integration, use its test mode to avoid affecting live data.

| Situation                                     | What to verify                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A referred friend follows a link and signs up | The new participant is associated with their referrer.                                                                      |
| The qualifying action happens later           | The referrer gets credit when the friend completes the action that counts within the referral credit window, not at signup. |
| A participant reaches a reward goal           | The reward unlocks once the participant reaches the number of referrals needed to earn it.                                  |
| A reward needs manual approval                | A reward is issued after it has been approved.                                                                              |
| A friend receives an upfront discount         | The friend can use the coupon before purchase, while the referrer's reward waits for the qualifying action.                 |
| A webhook is delivered again                  | If the same webhook event is received more than once, your application should only issue the reward once.                   |

Review the participant’s activity, progress, and reward details to make sure everything works as expected from the referral link to the reward.



# Google Tag Manager

Install GrowSurf with Google Tag Manager, step by step.

{% hint style="danger" %}
**Important Note:**

Many ad blockers stop Google Tag Manager from loading. If it is blocked, referrals will not work.
{% endhint %}

**Step 1:** In your Tag Manager console, click 'Add a new tag' (located in the *New Tag* card).

![Add new tag](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPC6LXpVTs-agB6CX%2F-LojPTSf-1sRd-BmPWUF%2FScreen%20Shot%202019-09-14%20at%205.57.33%20PM.png?alt=media\&token=26f24bdd-390e-4ae6-b215-b3292ee0058d)

**Step 2:** In the top input field, rename the tag to 'GrowSurf Universal Code'

![Rename the tag to 'GrowSurf Universal Code'](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPVN8ZxuwJmzhuJ4o%2F-LojPZnOvlk4SnpZ8UQk%2FScreen%20Shot%202019-09-14%20at%205.59.46%20PM.png?alt=media\&token=187a0177-d2ea-4555-9fba-cd38db4a99a8)

**Step 3:** Click the *Tag Configuration* card and a 'Choose tag type' options menu will slide in from the right side. Scroll down and select 'Custom HTML'

![Choose 'Custom HTML' as the tag type](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPVN8ZxuwJmzhuJ4o%2F-LojPdsH3fE2IcWg6k7_%2FScreen%20Shot%202019-09-14%20at%206.00.16%20PM.png?alt=media\&token=5d2c3e57-1627-44b0-93d7-18ae06edc77c)

**Step 4:** In the *HTML* section, paste your program-specific [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code)

![Add your program-specific GrowSurf Universal Code](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPVN8ZxuwJmzhuJ4o%2F-LojPlAfaHbnuA2w-Cqc%2FScreen%20Shot%202019-09-14%20at%206.03.56%20PM.png?alt=media\&token=f5f7be95-eca8-419e-9bd5-45fc3d40441c)

**Step 5:** Click the *Triggering* card and then click on 'All Pages' in the *Choose a trigger* menu that slides in from the right (this will load the GrowSurf Universal Code on all pages of your site, which we recommend)

![Select 'All Pages' as the trigger](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPVN8ZxuwJmzhuJ4o%2F-LojPstxUtvJsuQdPdcv%2FScreen%20Shot%202019-09-14%20at%206.04.54%20PM.png?alt=media\&token=9e35d218-2c0c-4012-a1ca-2283cf165810)

**Step 6:** Click the top-right blue 'Save' button to save the tag

![Click the top-right blue 'Save' button](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPVN8ZxuwJmzhuJ4o%2F-LojPy3P8ioct4bmXd8j%2FScreen%20Shot%202019-09-14%20at%206.05.03%20PM.png?alt=media\&token=e882d36f-7cee-47ea-8e66-a856243645dc)

**Step 7:** Click the top-right blue 'Submit' button to save your workspace

![Click the top-right blue 'Submit' button](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LojPVN8ZxuwJmzhuJ4o%2F-LojQ1_4-o5JUtYrlWqN%2FScreen%20Shot%202019-09-14%20at%206.06.46%20PM.png?alt=media\&token=7aed0338-e252-4913-91bd-f944c822376e)

## Need help?

* [Google Tag Manager Help](https://support.google.com/tagmanager/?hl=en#topic=3441530)
* [GrowSurf Docs - JavaScript SDK](https://docs.growsurf.com/developer-tools/javascript-sdk)


# Participant Auto Authentication

If your program is configured to have participants log in, you can set up Participant Auto Authentication to automatically log participants into their browser.

## **Set up the client**

**Step 1:** Require participants to log in within the Program Editor

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzeEKIPaRQ4e6rz142X%2F-LzeGapQc_6sLaaE6Y5y%2FScreen%20Shot%20on%202020-01-27%20at%2021%3A47%3A57.png?alt=media\&token=09c1deaf-edd2-4592-afe0-897ccefbed59)

**Step 2:** Generate a new *Participant Auth Secret*

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzeEKIPaRQ4e6rz142X%2F-LzeGw_R8zE4F-YNjnl7%2FScreen%20Shot%20on%202020-01-27%20at%2021%3A52%3A35.png?alt=media\&token=b8f6b141-6f02-4769-b1d5-08e4c0a0b832)

**Step 3:** Copy your unique *Participant Auth Secret* (to use for later in the [Setting up the server](#set-up-the-server) instructions).

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzeEKIPaRQ4e6rz142X%2F-LzeH37ZyvFdqSs4xbLO%2FScreen%20Shot%20on%202020-01-27%20at%2021%3A49%3A20.png?alt=media\&token=40df4c94-10b5-4ab5-85d5-6060880a87a2)

{% hint style="info" %}
Keep your *Participant Auth Secret* private. Do not put it in GitHub, Bitbucket, or client code.
{% endhint %}

**Step 4:** Go to the final instructions page within the Program Editor to copy the new GrowSurf Universal Code.

Adding a *Participant Auth Secret* changes the snippet, so reinstall the new [GrowSurf Universal Code](/getting-started.md#step-1-install-the-growsurf-universal-code-onto-your-site).

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzjOocJWBqzbDvkaxYj%2F-LzjP_6Io515016gWklX%2FScreen%20Shot%20on%202020-01-28%20at%2021%3A48%3A06.png?alt=media\&token=8c3b2f93-97e6-4bb8-bf50-ba8d3b606bca)

This new GrowSurf Universal Code snippet contains a new `window.grsfConfig` Object. Remember to replace two values: (1) set `email` as the participant's email address, and (2) set `hash` as the value you receive from [setting up the server](#set-up-the-server). See the example code block below:

```markup
<script type="text/javascript">
  window.grsfConfig = {
    email: "participant@email.com", // Replace this with the participant's email address
    hash: "HASH_VALUE" // Replace this with the SHA-256 HMAC value
  };

  (function(g,r,s,f){g.growsurf={};g.grsfSettings={campaignId:"k1o87e",version:"2.0.0"};s=r.getElementsByTagName("head")[0];f=r.createElement("script");f.async=1;f.src="http://localhost:3000/static/growsurf.js"+"?v="+g.grsfSettings.version;f.setAttribute("grsf-campaign", g.grsfSettings.campaignId);!g.grsfInit?s.appendChild(f):"";})(window,document);
</script>
```

## Set up the server

On your server, you will need to create a *Hash-based message authentication code* (HMAC).

**Step 1:** Implement SHA-256 HMAC, passing in the following values:

* The *Participant Auth Secret (*&#x66;rom Step 3 of the [Setting up the client](#set-up-the-client) section)
* The participant's email address

Below is an example of the HMAC implementation in Node.js:

{% tabs %}
{% tab title="Node.js" %}

```javascript
require("crypto")
  .createHmac("sha256", "<YOUR_SECRET>")
  .update("participant@email.com")
  .digest("hex");
```

{% endtab %}
{% endtabs %}

## Authorize affiliate Join

For an affiliate program that reviews applications, Participant Auto Authentication proves identity but does not bypass review. GrowSurf shows the normal Apply experience when the authenticated person is not already an approved affiliate.

To let a specific signed-in user join directly, create the SHA-256 HMAC from the exact email followed by `:AFFILIATE_JOIN`:

```javascript
require("crypto")
  .createHmac("sha256", "<YOUR_SECRET>")
  .update("participant@email.com:AFFILIATE_JOIN")
  .digest("hex");
```

Then include the optional `affiliateJoin` field with the same email and scoped hash:

```javascript
window.grsfConfig = {
  email: "participant@email.com",
  hash: "AFFILIATE_JOIN_SCOPED_HMAC",
  affiliateJoin: true
};
```

GrowSurf shows a Join confirmation and records the participant's acceptance of the current program terms. A pending, denied, suspended, or banned state cannot be bypassed. Omit `affiliateJoin` and continue signing the email alone for ordinary Participant Auto Authentication.

## **Testing**

To test, load a page where GrowSurf is installed. If it works, you are signed in as a participant.

Related references:

* JavaScript SDK method [`growsurf.init()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-reinitialize-growsurf)
* [Single Page Applications](https://docs.growsurf.com/developer-tools/javascript-sdk/single-page-applications)
