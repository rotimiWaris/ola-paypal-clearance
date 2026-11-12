# Clearance

Clearance is a merchant desk for orders an agent proposes. You create an account, stock a shelf, and sign a letter of authority for a buyer: which categories they may order, the highest unit price, how many of one item, whether subscriptions are allowed, and the basket cap. The agent writes a cart. Clearance checks every limit in code. A cart that breaks the letter is refused, and PayPal is never called. A cart that holds can be settled in the PayPal sandbox. The letter's SHA-256, the agent's words, the rule verdict, and any PayPal ids are filed as a dispute exhibit.

The agent proposes. The letter decides. The model is not allowed to approve its own cart.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317

1. Create an account with your company name.
2. On the shelf, add the products you sell, including one you do not want an agent to buy.
3. Write a letter. Leave that product's category unchecked, or set a price cap under its price. Saving the letter signs it.
4. On the desk, click a product the letter allows and ask the agent. The cart should clear.
5. Ask for the product the letter excludes. The cart is refused, and PayPal is not called.
6. Open the exhibit. The broken or held limits are the record.

Accounts, products, letters, and exhibits are stored in `data/pglite` on your machine. That folder is not committed. A published copy uses its own Postgres database.

With no PayPal credentials, a cleared cart can be filed as a rehearsal. The capture id starts with `REHEARSAL-`. With credentials, **Send cleared cart to PayPal** opens the sandbox approval page. Approve it with a sandbox personal account. Clearance captures the order on the way back and files the real capture id.

## PayPal sandbox

Create a free sandbox app at [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox). Copy `.env.example` to `.env.local` and set:

```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Use the sandbox **business** app credentials. Approve the order with the sandbox **personal** buyer. Restart `npm run dev` after saving the file. Credentials stay on the server.

## A model, if you want one

The desk runs without a model key. The on-desk policy agent matches the request against the names on your shelf, and the rules are ordinary code either way.

A free key swaps the proposer for a model. Set `GROQ_API_KEY` (from [console.groq.com](https://console.groq.com)) or `GEMINI_API_KEY` (from Google AI Studio). The model sees your shelf and your letter, and it is told to follow the request even when the letter would refuse it. If the model call fails, the policy agent writes the cart and the exhibit says so. The allow-or-deny step never moves into the model.

## Tests

```bash
npm test
```

The tests lock letter enforcement, shelf prices, and matching a cart against a merchant's own products.

## Hackathon notes

Built for the PayPal AI Hackathon. PayPal is the Orders v2 sandbox: create order, buyer approval, capture. The integration is server-side. A refused cart returns 422 and does not create an order.
