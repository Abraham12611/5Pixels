# Metadata

Use metadata to save your own data on participants and rewards.

Certain GrowSurf objects, such as [`Participants`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participant) and [`Rewards`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#reward) can have a special `metadata` parameter, which is useful for storing any custom information.

## Use Cases

Here are some examples of how you could use `metadata`:

* Issue different reward values to participants based on their different `metadata` properties. [Learn more here](https://support.growsurf.com/article/357-how-to-set-up-dynamic-rewards).
* If you need to save custom data to a participant to display or use later in your own application.
* Attach custom key/value data to rewards in your program to retrieve later via the REST API when automating a reward via Webhooks or Zapier.

***

## Overview

### **Participant metadata**

* Can be set via the program editor, admin dashboard, REST API, JavaScript Web API, and embeddable elements
* Can be retrieved via REST API and is available via Webhooks
* Can be used to find participants via the admin dashboard and REST API
* Can be viewed from your admin dashboard and when you download your participants list

### **Reward metadata**

* Can be set via the program editor
* Can be retrieved via JavaScript, REST API and is available via Webhooks
* Can be used in pre-populated social share and invite messages, and within GrowSurf emails

***

## Participant metadata <a href="#setting-participant-metadata" id="setting-participant-metadata"></a>

### Setting participant metadata

There are several different ways to save metadata to a participant.

#### **Program Editor**

**For referred participants**:

From *Program Editor > 5. Installation*, navigate to the automagic form detection setup section (the page with the title "*Choose forms from your site or web app to automatically track.*"). This form is for tracking referred people who came to your website through their friend's unique referral link.

Select a form and choose the input fields to save with each form submission. Any custom field that is not "Email", "First Name", or "Last Name" will be saved as metadata.

<figure><img src="https://docs.growsurf.com/~gitbook/image?url=https%3A%2F%2F2794996218-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LeklWo0yn03AhWro2Ux%252Fuploads%252Fe5hE7KzLLnxtONKiFrax%252Fimage.png%3Falt%3Dmedia%26token%3D489c6996-c79d-4b72-a710-fcb06a607f57&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=d1ca1fea&#x26;sv=2" alt=""><figcaption><p>Choose the fields you want to save as metadata for referred participants</p></figcaption></figure>

**For referrers (your users/customers):**

From *Program Editor > 2. Design*, you can update the Signup Form with custom fields. This signup form is intended for your users/customers who sign up to your referral program in order to refer their friends.

When a participant signs up from your referral portal, they also fill in the custom fields, which are saved as participant metadata.

<figure><img src="https://docs.growsurf.com/~gitbook/image?url=https%3A%2F%2F2794996218-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LeklWo0yn03AhWro2Ux%252Fuploads%252FPy2zi9LiXoiVFlXA8jFi%252Fimage.png%3Falt%3Dmedia%26token%3D16823dd7-c065-40a3-970a-f8d0688c39eb&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=1b7dd145&#x26;sv=2" alt=""><figcaption><p>Update the Signup Form in the Program Editor</p></figcaption></figure>

<figure><img src="https://docs.growsurf.com/~gitbook/image?url=https%3A%2F%2F2794996218-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LeklWo0yn03AhWro2Ux%252Fuploads%252FHPZEZDtmraCXiySwR3oW%252Fimage.png%3Falt%3Dmedia%26token%3D38ae38da-6952-4dd8-bfa9-080e834f415a&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=b323216a&#x26;sv=2" alt=""><figcaption><p>When a participant signs up for the first time on your referral portal (or from the <a href="https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form">Embedded Signup Form</a>), custom fields will be saved as metadata</p></figcaption></figure>

#### **Admin Dashboard**

When you are viewing a participant from the GrowSurf admin dashboard, you can add or update their metadata.

<figure><img src="https://docs.growsurf.com/~gitbook/image?url=https%3A%2F%2F2794996218-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LeklWo0yn03AhWro2Ux%252Fuploads%252FCovZ45wj8aNNyX47VhFh%252Fimage.png%3Falt%3Dmedia%26token%3D5548a602-03e3-4c84-a681-c55bf7323688&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=6f531cd5&#x26;sv=2" alt=""><figcaption><p>Update a participant in the admin dashboard</p></figcaption></figure>

#### **REST API**

You can use these REST API endpoints to add or update a participant's metadata:

**For adding new participants:**

* [`/POST Add Participant`](https://docs.growsurf.com/developer-tools/rest-api/api-reference#post-campaign-id-participant)

**For updating existing participants:**

* [`/POST Update Participant`](https://docs.growsurf.com/developer-tools/rest-api/api-reference#post-campaign-id-participant-participantidoremail)

#### **JavaScript SDK**

You can use the JavaScript method [`growsurf.addParticipant()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#post-campaign-id-participant) to add metadata to a participant. Any keys other than `email`, `firstName`, and `lastName` will be saved as metadata. Metadata will only be set for new participants.

**Example**:

```javascript
growsurf.addParticipant({
  email: 'gavin@hooli.com',
  company: 'Hooli',
  subscriptionPlan: 'businessPlan'
}).then(participant => {
  // handle participant
});
```

{% hint style="warning" %}
**Note**: Participant metadata cannot be updated using the JavaScript SDK. You must use the REST API to update metadata for existing participants.
{% endhint %}

#### **Embeddable Elements**

You can pass in custom participant values into any [Embeddable Element](https://docs.growsurf.com/developer-tools/embeddable-elements) using the `data-grsf-metadata` attribute. Metadata will only be set for new participants.

**Example**:

```html
<div data-grsf-block-form
 data-grsf-email="gavin@hooli.com"
 data-grsf-metadata="{'company': 'Hooli', ''subscriptionPlan': 'businessPlan'}"></div>
```

{% hint style="warning" %}
**Note**: Participant metadata cannot be updated using embeddable elements. You must use the REST API to update metadata for existing participants.
{% endhint %}

### Using participant metadata

#### REST API

You can use these REST API endpoints to retrieve a participant's metadata:

* [`/GET Participant`](https://docs.growsurf.com/developer-tools/rest-api/api-reference#get-campaign-id-participant-participantidoremail)

To find participants by a metadata value, such as a customer ID from your own system, filter the participants list with `metadata[key]=value`. Only exact matches are returned, and you can combine up to 3 keys in one request.

* [`/GET List Participants`](https://docs.growsurf.com/developer-tools/rest-api/api-reference#get-campaign-id-participants), for example `/v2/campaign/{id}/participants?metadata[customerId]=12345`

#### Webhooks

Participant metadata is returned on all participant payloads in [Webhook events](https://docs.growsurf.com/developer-tools/webhooks/events-reference).

***

## Reward metadata

### Setting reward metadata

There is only one way to update reward metadata, from *Program Editor > 1. Rewards*.

<figure><img src="https://docs.growsurf.com/~gitbook/image?url=https%3A%2F%2F2794996218-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LeklWo0yn03AhWro2Ux%252Fuploads%252FzTCUqxDKBDVne4upke6I%252Fimage.png%3Falt%3Dmedia%26token%3D942d5e8a-1d54-4646-ac26-683b83c3f6f1&#x26;width=768&#x26;dpr=4&#x26;quality=100&#x26;sign=45b71059&#x26;sv=2" alt=""><figcaption><p>Add/edit reward metadata from the program editor</p></figcaption></figure>

### Using reward metadata <a href="#policies-1" id="policies-1"></a>

You can then reference this reward metadata in different places of the Program Editor for UI purposes. For example, metadata will be available as an option by clicking the "+ Personalize" dropdown in social sharing, invites, and emails.

#### JavaScript <a href="#policies-1" id="policies-1"></a>

If you are using the JavaScript SDK, you can also retrieve reward metadata by calling [`growsurf.getCampaign()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-campaign). This is useful for displaying any custom reward details in your UI.

#### Webhooks

Reward metadata is returned on all `campaign` payloads in [Webhook events](https://docs.growsurf.com/developer-tools/webhooks/events-reference). You can reference metadata when automating rewards using webhooks. This is useful so that your marketing team can make changes anytime to reward values in the future without getting developers involved.

***

### Tutorial

View the following guide to help you add reward metadata and reference it throughout participant-facing elements of your GrowSurf program.

<details>

<summary><strong>Guide to implementing reward metadata</strong></summary>

#### 1. Add metadata to a reward

* Go to *Program Editor > 1. Rewards* and click the Continue button.
* Open the reward you want to edit.
* Click "Advanced reward settings" and scroll to the Metadata section.
* Click "Add Metadata", and enter `rewardForReferrer` for the key, and `50` for the value.
* Click "Add Metadata" again, and enter `rewardForReferred` for the key, and `50` for the value.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FCbMpwS3tRakYzbhSFa5V%2Fimage.png?alt=media&amp;token=787121b4-d7d7-4aab-9c9f-fe567bcabe6d" alt=""><figcaption></figcaption></figure>

***

#### 2. Update program design

* Go to *Program Editor > 2. Design*.
* Here are the sections you'll want to update with reward metadata:
  * **Header Content**
  * **Share (Social & Email Invites)**
  * **Referred Friend Motivators** **(Welcome Banner and Inline Welcome Message)**
* For each element in the sections above, click the "+ Personalize" button underneath each input field, and from the dropdown select the reward metadata you added from step 1 above. See the images below as examples.

**Header Content**

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2F6UIjMe8atdgKLlIi06WK%2FScreenshot_11.png?alt=media&amp;token=dcbe366c-9feb-42cc-a98d-861915e8b90a" alt=""><figcaption></figcaption></figure>

To explain this first example: The text `Sign up for Subank and receive ${{campaignReward['p6k82i']['rewardForReferrer']}}!` will be rendered as `Sign up for Subank and receive $50!`.

**Share**

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FxFMu8y6KssfMAqINt4Ru%2Fimage.png?alt=media&amp;token=bb4da541-3f04-46eb-87ed-4755f4be4a10" alt=""><figcaption></figcaption></figure>

After you add reward metadata to a share message, see how it renders by clicking on the corresponding share button in the live preview section of the Program Editor.

**Referred Friend Motivators**

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FYuCNerDpkb58RkPZlx2D%2Fimage.png?alt=media&amp;token=62b8c9c0-a91e-4f2f-ac70-8af4e5ec4d44" alt=""><figcaption></figcaption></figure>

To explain this example, the `{{referrerName}} invited you to join Subank! Sign up today and get ${{campaignReward['p6k82i']['rewardForReferred']}}!` will be rendered as `Gavin B invited you to join Subank! Sign up today and get $50!`.

***

#### 3. Update program emails

* Go to *Program Editor > 3. Emails*.
* Open the "New Participant Reward" email.
* In the Email Body section, type in the following: `{{isReferrer ? ("You've just earned a $" + campaignReward["p6k82i"]["rewardForReferrer"] + " gift card for referring a friend!") : ("You just got a $" + campaignReward["p6k82i"]["rewardForReferred"] + " gift card for activating your account and making your first purchase!") }}`
* Preview the changes on the right-side section to make sure everything is rendering properly.
  * For referrers, the text would render like this: `You've just earned a $50 gift card for referring a friend!`.
  * For referred friends, the text would render like this: `You just got a $50 gift card for activating your account and making your first purchase!`
* Repeat the above steps for all emails that you want to reference reward metadata in.
  * Note: For other emails, click the "+ Personalize" button to insert reward metadata. Only the "New Participant Reward" email needs the `{{isReferrer ? ... : ... }}` syntax, because a double-sided reward sends it to both people.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FKQgfYk6KYMMU906BUs4p%2FScreenshot_12.png?alt=media&amp;token=afa41318-c5cd-4fbe-80d6-7f0c4d9f8f11" alt=""><figcaption></figcaption></figure>

***

#### 4. Final review and testing

Make sure to thoroughly [test your program](https://support.growsurf.com/article/209-best-practices-for-testing-your-campaign) by signing up as both the referrer and a referred friend to ensure the reward metadata displays correctly in different elements.

</details>

## Policies <a href="#policies-1" id="policies-1"></a>

The following are the policies when creating or updating metadata.

| Policy                  | Limit            |
| ----------------------- | ---------------- |
| **Metadata Key**        | 40 characters    |
| **Metadata Value**      | 500 characters   |
| **Total Metadata Keys** | 50 keys / object |
| **Key Characters**      | Alphanumeric     |

{% hint style="info" %}
**Note the following:**

* All metadata keys will be converted to camelCase. For example, if you provide a key "My Metadata Key" that key will be converted to `myMetadataKey`.
* **Important:** Do not store any sensitive information (personally identifiable information, such as credit cards and social security numbers) as metadata within GrowSurf, as metadata rewards are accessible from the JavaScript SDK.
  {% endhint %}
