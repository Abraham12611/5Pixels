# Webhooks

Webhooks send data to your server when important events occur in your referral/affiliate program. This lets you deliver rewards automatically or update users in your database.

{% hint style="info" %}
**Using AI?** Follow [Build with AI](https://docs.growsurf.com/build-with-ai).
{% endhint %}

## Example scenarios

Here are a few scenarios in which you would use webhooks:

* If you have an internal points system, webhooks allow you to add credits to users in your database whenever a referral occurs.
* When a new participant joins your referral or affiliate program, webhooks let you store their unique referral link (along with other participant details) in your database.
* For referral programs, use `PARTICIPANT_REACHED_A_GOAL` to deliver approved rewards in your own system. Follow [Referral Program Workflow](/getting-started/referral-program-workflow.md) for approval handling, double-sided rewards, and repeated deliveries.
* For affiliate programs, use `NEW_COMMISSION_ADDED`, `COMMISSION_ADJUSTED`, and `NEW_PAYOUT_ISSUED` to update commission and payout records in your own reporting system. Follow the [conversion-to-payout workflow](/getting-started/affiliate-program-workflow.md) and use the exact payloads in the [event reference](/developer-tools/webhooks/events-reference.md).

## Getting started

### Step 1: Add a webhook URL to your program

1. Go to the *Options* step in the *Program Editor*.
2. In the *Set up integrations* sectio&#x6E;*,* click the *Webhooks* card. Then enter your webhook endpoint URL.
3. Publish/save your changes.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2F5NkccYY1vutOLCEkNmHd%2FScreen%20Shot%202026-01-23%20at%208.02.29%20PM.jpg?alt=media&amp;token=fe24173a-7fca-4359-824f-75e925f79d9a" alt=""><figcaption><p>Webhooks can be configured in the Options step in the Program Editor</p></figcaption></figure>

{% hint style="info" %}
**Tips:**

* Click *Test* next to the webhook URL to check your setup and see sample data.
* You can select the specific events to receive within the *advanced webhook settings* section.
* A total of 5 webhooks can be added per program.
  {% endhint %}

## **Retry logic**

If the first delivery fails, GrowSurf retries for several days with exponential backoff, then marks the webhook undeliverable and stops retrying.

Webhook events are stored durably, so if delivery is ever interrupted, they will be retried once service is restored. You can always check our [System Status page](https://growsurf.com/status) for webhook health.

## **Next steps**

View [Examples](/developer-tools/webhooks/examples.md) of implementing webhooks, or view what the request payloads for webhook events look like:

* [When a participant reaches a reward goal](/developer-tools/webhooks/events-reference.md#participant_reached_a_goal)
* [When a new participant is added to the program](https://docs.growsurf.com/developer-tools/webhooks/events-reference#new_participant_added)
* [When an affiliate commission is generated](https://docs.growsurf.com/developer-tools/webhooks/events-reference#new_commission_added)
* [When an affiliate commission is adjusted](https://docs.growsurf.com/developer-tools/webhooks/events-reference#commission_adjusted)
* [When an affiliate payout is issued](https://docs.growsurf.com/developer-tools/webhooks/events-reference#new_payout_issued)
* [When the program ends](https://docs.growsurf.com/developer-tools/webhooks/events-reference#campaign_ended)


# Securing Your Webhooks (optional)

Add a webhook secret so your endpoint can confirm each request comes from GrowSurf.

## Adding a secret

1. Go to the *Options* step in the *Program Editor*.
2. In the Webhooks integration, click *Show advanced webhook settings* and enter the secret (it can be any string of text).
3. Publish/save your changes.

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-M3vdUfIEVFzEyb52XMp%2F-M3vdyAlJ0GLVsKTKcLy%2FScreen%20Shot%20on%202020-04-02%20at%2011%3A09%3A29.png?alt=media\&token=bef770d4-c6da-4ac0-9435-3ad857bcff61)

{% hint style="info" %}
Once your program has a webhook secret, a signature `GrowSurf-Signature` will be included in the header of all outgoing requests to your webhook endpoint.
{% endhint %}

## Validating payloads

When your webhook secret has been set, GrowSurf uses it to create a hash signature to include in the header of each event notification payload.

{% hint style="info" %}
The `GrowSurf-Signature` header contains a timestamp and a signature hash value. The timestamp is prefixed by `ts=`, and the signature value is prefixed by `v=`.
{% endhint %}

### **Step 1: Extract the timestamp and signature from the header**

Split the header using the `,` character as the separator to get a list of elements. Then split each element using the `=` character as the separator to get a key/value pair.\
\
`ts` is the timestamp. `v` is the signature to compare with your hash.

{% hint style="info" %}
NOTE: `ts` is a Unix timestamp in milliseconds
{% endhint %}

### **Step 2: Prepare the signed payload string for comparison**

Achieve this by concatenating:

* The timestamp (as a string). AKA the value of `ts`
* The character `.`
* The actual JSON payload within the request body

### **Step 3: Determine the expected signature**

Compute an *HMAC* with a `SHA256` hash function. Use your webhook secret as the key (which you added in the *Options* step in the *Program Editor*), and use the signed payload string from **Step 2** as the message.

### **Step 4: Compare signatures**

Compare the GrowSurf provided signature within the header to the expected signature. If they match then compute the difference between a current timestamp and the received timestamp `ts`. Then decide if the difference is within your tolerance.

{% hint style="info" %}
**Tip:** The timestamp comparison is completely optional but it will help to protect against timing attacks.
{% endhint %}

## View an example

[View an example here](/developer-tools/webhooks/examples.md#example-2-webhooks-with-secret)



# Examples

How to implement Webhooks for your GrowSurf program.

## Example 1: Webhooks

Below is a Node.js + Express example of what the code for your webhook endpoint could look like:

```javascript
//Your webhooks payload endpoint
app.post("/your/webhook/payload-url", function(req, res) {
  const body = req.body;
  
  try {
    if (body.event === 'PARTICIPANT_REACHED_A_GOAL') {
      // Write code here to do something when a participant wins a reward
      console.log(`${body.data.participant.email} just won this reward: ${body.data.reward.description}`);

      // If the reward is approved
      if (body.data && body.data.reward && body.data.reward.approved) {
        // Do something
      }
      
      // If this is a double-sided reward, use body.data.reward.isReferrer to determine if this is for the referrer or referred person
      if (body.data && body.data.reward && body.data.reward.isReferrer) {
        // Do something
        
        // Optional: If you set metadata on the CampaignReward object, you can reference it:
        if (body.data.reward.metadata && body.data.reward.metadata["proRewardValue"]) {
            console.log(`${body.data.participant.email} earned an amount of ${body.data.reward.metadata["proRewardValue"]}.`);
        }
      }
      
      // Optional: If this is the referrer that unlocked the reward, you can get the details of the person that they referred
      if (body.data.reward.isReferrer && body.data.participant.referee) {
          console.log(`${body.data.participant.referee.email} was the person referred by ${body.data.participant.email}.`);
      }      

    } else if (body.event === 'NEW_PARTICIPANT_ADDED') {
      // Write code here to do something when a new participant is added    
      console.log(`${body.data.email} just joined via source: ${body.data.referralSource}.`);
            
    } else if (body.event === 'CAMPAIGN_ENDED') {
      // Write code here to do something when a program ends
      console.log(`${body.data.name} just ended with ${body.data.referralCount} total referrals!`);
            
    }
  
  } catch (err) {
    res.status(400).end();
  }
  res.json({received: true});
});
```

{% hint style="info" %}
**Helpful tips:**

* To see the different sample data from webhook request payloads, see [Events](/developer-tools/webhooks/events-reference.md)
* If you reference [reward metadata](https://docs.growsurf.com/developer-tools/webhooks/events-reference#campaign_ended) in your `PARTICIPANT_REACHED_A_GOAL` events, your marketing team can update these values anytime in the future from the Program Editor without getting developers involved.
  {% endhint %}

## Example 2: Webhooks (with secret)

Below is a Node.js + Express example (using the [crypto-js](https://github.com/brix/crypto-js) library) of what the code for your webhook endpoint could look like:

```javascript
//Your webhooks payload endpoint
app.post("/your/webhook/payload-url", function(req, res) {
  const body = req.body;
  const signature = req.get("GrowSurf-Signature");
  
  try {
    // Validate the signature
    validateSignature(body, signature);
  
    // Do work!.....
    // Write your code in here...  
  
  } catch (err) {
    res.status(400).end();
  }
  res.json({received: true});
});

/**
 * Compares the GrowSurf header provided signature against the expected
 * signature.
 *
 * @param {Object} body the request body provided by GrowSurf
 * @param {String} signature the signature hash value provided within the header of the request
 * @returns {Boolean} valid true if the expected matches the given
 * @throws {Exception} thrown if the expected signature value does not match the given
 */
const validateSignature = function(body, signature) {
  // Extract
  let parts = signature.split(",");
  // t value
  let timestamp = parts[0].split("=")[1];
  // v value
  let hash = parts[1].split("=")[1];
  // Generate hash
  let message = (timestamp + "." + JSON.stringify(body));
  let expected = CryptoJS.HmacSHA256(message, "YOUR-SECRET-TOKEN").toString();

  // Validate/Compare
  if(expected === hash) {
    return true;
  } else {
    throw new Error("Invalid Signature");
  }
}
```

# Events Reference

Below are sample request payloads you will receive based on the webhook event types you have selected for your program.

## Overview

* **`PARTICIPANT_REACHED_A_GOAL`** - <mark style="color:orange;">Referral programs only.</mark> When a participant unlocks a new reward.
* **`NEW_PARTICIPANT_ADDED`** - When a new participant is added to the program (includes direct signups, referrals, and participants added/imported via admin dashboard).
* **`PARTICIPANT_FRAUD_STATUS_UPDATED`** - When an existing participant's fraud status changes.
* **`NEW_COMMISSION_ADDED`** - <mark style="color:orange;">Affiliate programs only.</mark> When a new commission is generated for an affiliate.
* **`COMMISSION_ADJUSTED`** - <mark style="color:orange;">Affiliate programs only.</mark> When an existing commission is adjusted (refunds, chargebacks, or refund cancellations).
* **`NEW_PAYOUT_ISSUED`** - <mark style="color:orange;">Affiliate programs only.</mark> When a payout is successfully issued to an affiliate.
* **`CAMPAIGN_ENDED`** - When the program ends.

***

## `PARTICIPANT_REACHED_A_GOAL`

<mark style="color:orange;">Referral programs only</mark>

**Description:** When a participant unlocks a new reward.

{% hint style="info" %}
**Important notes:**

* For double-sided rewards, GrowSurf sends two events: one for the referrer and one for the referred friend. To discern between the two, use the `data.reward.isReferrer` property (the referrer will have `isReferrer` as `true`).
  * You can confirm this by examining `data.reward.referrerId` and `data.reward.referredId` and comparing it with `data.participant.id`.
  * If the reward is for the referrer, you can view the person they referred by accessing `data.participant.referee`.
  * If the reward is for the referred friend, you can view the person who referred them by accessing `data.participant.referrer`.
* If you have manual reward approval enabled for your program, events will be sent twice: (1) when the reward is pending approval and (2) when the reward is approved. To discern between unapproved/approved rewards, use the `data.reward.approved` property (approved rewards will have `approved` as `true`).
* The `data.reward` object contains combined data from the [`CampaignReward`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#reward) and [`ParticipantReward`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#reward).
  * `data.reward.rewardId` is the ID of the `CampaignReward`, so it is the same for every participant who earns that reward. You can find this ID from *Program Editor > 1. Rewards* and clicking the reward.
  * `data.reward.id` represents the ID of the `ParticipantReward` that was unlocked for the participant. This will be different for every new reward that the participant earns. You can find this ID by going to your admin dashboard and viewing the participant's rewards.
    {% endhint %}

Here is an example event of a `PARTICIPANT_REACHED_A_GOAL` event where the reward is for the referrer because `data.reward.isReferrer` is `true`. The person they referred is reflected in `data.participant.referee`.

```json
{
  "event": "PARTICIPANT_REACHED_A_GOAL",
  "createdAt": 1558345202613,
  "data": {
    "participant": {
      "id": "x9a7uu",
      "email": "richard@piedpiper.com",
      "firstName": "Richard",
      "lastName": "Hendricks",
      "notes": "",
      "isWinner": true,
      "referralCount": 11,
      "monthlyReferralCount": 8,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
      "impressionCount": 309,
      "uniqueImpressionCount": 285,
      "shareCount": 163,
      "createdAt": 1554431962667,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "fraudReasonCode": "UNIQUE_IDENTITY",
      "metadata": {
        "piedPiperUserId": "12a39-8aajd-1dwiq",
        "companyName": "Pied Piper, Inc",
        "teamSize": "1-10"
      },
      "unsubscribed": false,
      "referee": {
        "id": "uxjbxu",
        "createdAt": 1738485195346,
        "email": "i_was_referred@somesite.com",
        "firstName": "Billy",
        "lastName": "Smith",
        "notes": "",
        "isWinner": false,
        "referralCount": 0,
        "monthlyReferralCount": 0,
        "prevMonthlyReferralCount": 0,
        "leadCount": 0,
        "vanityKeys": [],
        "shareUrl": "http://piedpiper.com?grsf=uxjbxu",
        "referralSource": "PARTICIPANT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTITY",
        "impressionCount": 0,
        "uniqueImpressionCount": 0,
        "shareCount": 0,
        "metadata": {},
        "unsubscribed": false
      }
    },
    "reward": {
      "approved": true,
      "conversionsRequired": 1,
      "couponCode": "PROMO_20_OFF",
      "createdAt": 1542560101404,
      "approvedAt": 1659474941892,
      "fulfilledAt": null,
      "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
      "imageUrl": "https://piedpiper.com/reward-image.png",
      "limit": 3,
      "title": "Early-Bird Reward",
      "isReferrer": true,
      "type": "SINGLE_SIDED",
      "rewardId": "crew_xlj123",
      "id": "prew_ccm2ue",
      "referredId": "ad3dfa",
      "referrerId": "x9a7uu",
      "metadata": {
        "foo": "bar",
        "amount": "$25",
        "points": 1000
      }
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": [
        {
          "title": "Early-Bird Reward",        
          "id": "crew_xlj123",
          "type": "SINGLE_SIDED",
          "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
          "referralDescription": null,          
          "isActive": true,
          "isVisible": true,
          "isUnlimited": true,
          "limit": 3,          
          "limitDuration": "IN_TOTAL",
          "conversionsRequired": 1,
          "numberOfWinners": 3,
          "imageUrl": "https://piedpiper.com/reward-image.png",
          "order": null,
          "couponCode": "PROMO_20_OFF",
          "nextMilestonePrefix": "You are only",
          "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
          "metadata": {
            "foo": "bar",
            "amount": "$25",
            "points": 1000
          }        
        }
      ]
    }
  }
}
```

***

## `NEW_PARTICIPANT_ADDED`

**Description:** When a new participant is added to the program (includes direct signups, referrals, and participants added/imported via admin dashboard).

Here is an example event of a `NEW_PARTICIPANT_ADDED` event where the newly added participant was referred. The person that referred them is reflected in `data.referrer`. If the participant was not referred, then `data.referrer` will not exist.

```json
{
  "event": "NEW_PARTICIPANT_ADDED",
  "createdAt": 1558345215720,
  "data": {
    "id": "p88y0a",
    "email": "gavin.belson@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "notes": "This is obviously our competitor trying out our product!",
    "isWinner": false,
    "shareUrl": "http://piedpiper.com?grsf=p88y0a",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "prevMonthlyReferralCount": 0,
    "leadCount": 0,
    "vanityKeys": [],
    "impressionCount": 0,
    "uniqueImpressionCount": 0,
    "shareCount": 3,
    "createdAt": 1554479231190,
    "referralSource": "PARTICIPANT",
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTITY",
    "referredBy": "x9a7uu",
    "referrer": {
      "id": "x9a7uu",
      "email": "richard@piedpiper.com",
      "firstName": "Richard",
      "lastName": "Hendricks",
      "notes": "",
      "isWinner": true,
      "referralCount": 11,
      "monthlyReferralCount": 8,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
      "impressionCount": 309,
      "uniqueImpressionCount": 285,
      "shareCount": 163,
      "createdAt": 1554431962667,
      "referralSource": "PARTICIPANT",
      "fraudRiskLevel": "LOW",
      "fraudReasonCode": "UNIQUE_IDENTITY",
      "metadata": {
        "piedPiperUserId": "12a39-8aajd-1dwiq",
        "companyName": "Pied Piper, Inc",
        "teamSize": "1-10"
      },
      "unsubscribed": false
    },
    "metadata": {
      "piedPiperUserId": "au71p-121x9-88faa",
      "companyName": "Hooli, Inc",
      "teamSize": "10,000+"
    },
    "unsubscribed": false,
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": [
        {
          "title": "Early-Bird Reward",        
          "id": "crew_xlj123",
          "type": "SINGLE_SIDED",
          "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
          "referralDescription": null,          
          "isActive": true,
          "isVisible": true,
          "isUnlimited": true,
          "limit": 3,
          "limitDuration": "IN_TOTAL",
          "conversionsRequired": 1,
          "numberOfWinners": 3,
          "imageUrl": "https://piedpiper.com/reward-image.png",
          "order": null,
          "couponCode": "PROMO_20_OFF",
          "nextMilestonePrefix": "You are only",
          "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
          "metadata": {
            "foo": "bar",
            "amount": "$25",
            "points": 1000
          }        
        }
      ]
    }    
  }
}
```

***

## `NEW_COMMISSION_ADDED`

<mark style="color:orange;">Affiliate programs only</mark>

**Description:** When a new commission is generated for an affiliate.

The nested `commission.event` value is `LEAD` for a commission earned when a referred customer signs up, or `SALE` for a commission earned from a sale. For `LEAD`, `saleAmount`, `saleAmountInCampaignCurrency`, and `provider` are `null` because no sale created the commission.

```json
{
  "event": "NEW_COMMISSION_ADDED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "",
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 1,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "impressionCount": 2,
      "uniqueImpressionCount": 2,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false
    },
    "referredParticipant": {
      "id": "xh345d",
      "email": "dinesh@piedpiper.com",
      "firstName": "Dinesh",
      "lastName": "Chugtai",
      "notes": "",
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=xh345d",
      "referralCount": 0,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "impressionCount": 0,
      "uniqueImpressionCount": 0,
      "shareCount": 0,
      "createdAt": 1554479231190,
      "referralSource": "PARTICIPANT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "AFFILIATE",
      "currencyISO": "USD",
      "rewards": []
    },
    "commission": {
      "id": "comm_jp1ku7",
      "referrerId": "p88y0a",
      "referredId": "xh345d",
      "event": "SALE",
      "amount": 2500,
      "currencyISO": "USD",
      "saleAmount": 10000,
      "status": "APPROVED",
      "createdAt": 1731494175123,  
      "approvedAt": 1731580575123,
      "paidAt": null,
      "reversedAt": null,
      "payoutQueuedAt": null,
      "holdDuration": 7,
      "provider": "stripe",
      "amountInCampaignCurrency": 2500,
      "saleAmountInCampaignCurrency": 10000,
      "campaignCurrencyISO": "USD",
      "exchangeRateAt": 1731494175123,
      "fxError": null
    }
  }
}
```

***

## `COMMISSION_ADJUSTED`

<mark style="color:orange;">Affiliate programs only</mark>

**Description:** When an existing commission is adjusted (refunds, chargebacks, or refund cancellations).

The nested `adjustedCommission.event` value is `LEAD` or `SALE`. For a `LEAD` commission, `saleAmount`, `saleAmountInCampaignCurrency`, and `provider` remain `null`.

```json
{
  "event": "COMMISSION_ADJUSTED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "",
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 1,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "impressionCount": 2,
      "uniqueImpressionCount": 2,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false
    },
    "referredParticipant": {
      "id": "xh345d",
      "email": "dinesh@piedpiper.com",
      "firstName": "Dinesh",
      "lastName": "Chugtai",
      "notes": "",
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=xh345d",
      "referralCount": 0,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "impressionCount": 0,
      "uniqueImpressionCount": 0,
      "shareCount": 0,
      "createdAt": 1554479231190,
      "referralSource": "PARTICIPANT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "AFFILIATE",
      "currencyISO": "USD",
      "rewards": []
    },
    "adjustment": {
      "currencyISO": "USD",
      "originalCommissionAmount": 9900,
      "newCommissionAmount": 0,
      "commissionAdjustedAmount": -9900,
      "reason": "FULL_REFUND",
      "adjustedAt": 1766393352171
    },
    "adjustedCommission": {
      "id": "comm_jp1ku7",
      "referrerId": "p88y0a",
      "referredId": "xh345d",
      "event": "SALE",
      "amount": 2500,
      "currencyISO": "USD",
      "saleAmount": 10000,
      "status": "PENDING",
      "createdAt": 1731494175123,  
      "approvedAt": null,
      "paidAt": null,
      "reversedAt": null,
      "payoutQueuedAt": null,
      "holdDuration": 14,
      "provider": "stripe",
      "amountInCampaignCurrency": 2500,
      "saleAmountInCampaignCurrency": 10000,
      "campaignCurrencyISO": "USD",
      "exchangeRateAt": 1731494175123,
      "fxError": null
    }    
  }
}
```

***

## `NEW_PAYOUT_ISSUED`

<mark style="color:orange;">Affiliate programs only</mark>

**Description:** When a payout is successfully issued to an affiliate.

```json
{
  "event": "NEW_PAYOUT_ISSUED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "",
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 1,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "impressionCount": 2,
      "uniqueImpressionCount": 2,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "AFFILIATE",
      "currencyISO": "USD",
      "rewards": []
    },
    "payout": {
      "id": "po_k11ps9",
      "participantId": "p88y0a",
      "commissionIds": [
        "comm_jp1ku7",
        "comm_a98s7z"
      ],
      "amount": 3600,
      "currencyISO": "USD",
      "status": "ISSUED",
      "createdAt": 1731494295334,  
      "issuedAt": 1731580575123,
      "failedAt": null,
      "provider": "paypal",
      "amountInCampaignCurrency": 3600,
      "campaignCurrencyISO": "USD",
      "exchangeRateAt": 1731580575217,
      "exchangeRate": 1.0,
      "fxError": null
    }    
  }
}
```

***

## `PARTICIPANT_FRAUD_STATUS_UPDATED`

**Description:** When an existing participant's fraud status changes.

This webhook event is emitted if either of the following happens:

* If you manually mark a participant as a fraudster or non-fraudster from the GrowSurf admin dashboard. [Learn more here](https://support.growsurf.com/article/195-what-does-the-growsurf-anti-fraud-system-entail).
* If GrowSurf's anti-fraud system automatically identifies a referrer as a fraudster after they tried referring someone.

Here is an example of a `PARTICIPANT_FRAUD_STATUS_UPDATED` event where you can check the participant's fraud status via `data.participant.fraudRiskLevel` (it will be one of the following options: `"LOW"`, `"MEDIUM"`, or `"HIGH"`). You can also check the fraud reason code via `data.participant.fraudReasonCode` (see the [`Participant`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participant) object for all fraud reason code options).

```json
{
  "event": "PARTICIPANT_FRAUD_STATUS_UPDATED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "This is obviously our competitor trying out our product!",
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 0,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "leadCount": 0,
      "vanityKeys": [],
      "impressionCount": 0,
      "uniqueImpressionCount": 0,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "PARTICIPANT",
      "fraudRiskLevel": "HIGH",
      "fraudReasonCode": "REFERRAL_CHAIN_FRAUD",
      "referredBy": "x9a7uu",
      "referrer": {
        "id": "x9a7uu",
        "email": "richard@piedpiper.com",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "notes": "",
        "isWinner": true,
        "referralCount": 11,
        "monthlyReferralCount": 8,
        "prevMonthlyReferralCount": 0,
        "leadCount": 0,
        "vanityKeys": [],
        "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
        "impressionCount": 309,
        "uniqueImpressionCount": 285,
        "shareCount": 163,
        "createdAt": 1554431962667,
        "referralSource": "PARTICIPANT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTITY",
        "metadata": {
          "piedPiperUserId": "12a39-8aajd-1dwiq",
          "companyName": "Pied Piper, Inc",
          "teamSize": "1-10"
        },
        "unsubscribed": false
      },
      "metadata": {
        "piedPiperUserId": "au71p-121x9-88faa",
        "companyName": "Hooli, Inc",
        "teamSize": "10,000+"
      },
      "unsubscribed": false
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": [
        {
          "title": "Early-Bird Reward",        
          "id": "crew_xlj123",
          "type": "SINGLE_SIDED",
          "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
          "referralDescription": null,          
          "isActive": true,
          "isVisible": true,
          "isUnlimited": true,
          "limit": 3,
          "limitDuration": "IN_TOTAL",
          "conversionsRequired": 1,
          "numberOfWinners": 3,
          "imageUrl": "https://piedpiper.com/reward-image.png",
          "order": null,
          "couponCode": "PROMO_20_OFF",
          "nextMilestonePrefix": "You are only",
          "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
          "metadata": {
            "foo": "bar",
            "amount": "$25",
            "points": 1000
          }        
        }
      ]
    }    
  }
}
```

***

## `CAMPAIGN_ENDED`

**Description:** When the program ends.

{% hint style="info" %}
The `winners` array includes only the first 1,000 winners.
{% endhint %}

```json
{
  "event": "CAMPAIGN_ENDED",
  "createdAt": 1558345152138,
  "data": {
    "id": "ct8f71",
    "name": "Middle-Out Compression Launch",
    "type": "REFERRAL",
    "participantCount": 5661,
    "startedAt": 1522432573250,
    "endedAt": 1533532422153,
    "status": "COMPLETE",
    "impressionCount": 11075,
    "referralCount": 1673,
    "winnerCount": 1673,
    "winners": [
      {
        "id": "x9a7uu",
        "email": "richard@piedpiper.com",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "notes": "",
        "isWinner": true,
        "referralCount": 11,
        "monthlyReferralCount": 8,
        "prevMonthlyReferralCount": 0,
        "leadCount": 0,
        "vanityKeys": [],
        "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
        "impressionCount": 309,
        "uniqueImpressionCount": 285,        
        "shareCount": 163,
        "createdAt": 1554431962667,
        "referralSource": "PARTICIPANT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTITY",        
        "metadata": {
          "piedPiperUserId": "12a39-8aajd-1dwiq",
          "companyName": "Pied Piper, Inc",
          "teamSize": "1-10"
        },
        "unsubscribed": false
      }
    ],
    "rewards": [
      {
        "title": "Early-Bird Reward",        
        "id": "crew_xlj123",
        "type": "SINGLE_SIDED",
        "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
        "referralDescription": null,          
        "isActive": true,
        "isVisible": true,
        "isUnlimited": true,
        "limit": 3,
        "limitDuration": "IN_TOTAL",
        "conversionsRequired": 1,
        "numberOfWinners": 3,
        "imageUrl": "https://piedpiper.com/reward-image.png",
        "order": null,
        "couponCode": "PROMO_20_OFF",
        "nextMilestonePrefix": "You are only",
        "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
        "metadata": {
          "foo": "bar",
          "amount": "$25",
          "points": 1000
        }        
      }
    ]    
  }
}
```
