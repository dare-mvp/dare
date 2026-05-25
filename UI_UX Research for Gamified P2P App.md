# **Comprehensive UI/UX Design Architecture for the DARE Platform: A High-Trust, Multi-Channel Challenge Economy**

The transition toward digital "jobtech" and decentralized peer-to-peer (P2P) wagering systems represents a major evolution in the African digital economy.1 By the end of 2025, the competitive wagering market in Sub-Saharan Africa reached an estimated USD 3.08 billion, fueled by a smartphone base of over 600 million connections and a dominant mobile money infrastructure that accounts for 70% of global transactions.1 The maturation of the African Continental Free Trade Area (AfCFTA) has further catalyzed this ecosystem by reducing cross-border trade friction and lowering custom clearance times by 30% to 50% in digitized markets.1  
Operating within this landscape requires a highly resilient, compliant, and data-conscious digital architecture.1 The DARE platform represents a peer-to-peer challenge economy where authenticated users browse active wagers, configure challenges via an structured step-by-step "constitution" wizard, participate in live, real-time adjudicated court matches, and resolve disputes through crowdsourced community juries.1 To maximize market penetration and bridge the significant "usage gap"-where 78% of the population has 4G coverage but 64% remain offline due to the prohibitive cost of mobile data-the platform must deploy a dual-channel user interface (UI) strategy.1 This approach combines a modern, responsive Single-Page Application (SPA) with a lightweight, zero-data Unstructured Supplementary Service Data (USSD) gateway companion.1

## **Multi-Channel UI Strategy: Single-Page App vs. USSD Gateway**

A successful jobtech and wagering implementation must design interfaces that respect extreme network fragmentation.1 Approximately 50% of connections in Sub-Saharan Africa remain on legacy 3G networks, and the bottom 20% of earners face smartphone costs exceeding 80% of their monthly income.1 Consequently, the user experience (UX) must be engineered to function across a spectrum of devices and bandwidth conditions.4  
The primary interface is a highly interactive, dark-mode-first SPA designed for modern smartphones.1 Dark mode reduces mobile battery consumption on OLED screens and decreases eye strain during live, real-time court sessions.6 The SPA employs a single-column layout for small mobile viewports, placing primary interactive elements above the fold and utilizing responsive typography to scale gracefully across varying resolutions.8  
To serve the vast segment of unbanked and data-constrained users, the platform integrates a USSD gateway companion modeled after highly successful mobile money deployments like M-Pesa.1 USSD operates on GSM signaling channels, incurs zero data costs for the consumer, and works on low-end feature phones.2

                              
   (High-Bandwidth / 4G / 5G)                      (Low-Bandwidth / 3G)  
   [Live Court Page]         [Accept Challenge]  
(Supabase Realtime)  (Broadcast channels)    (Static Query)     (Numeric PIN Input)

Designing an effective USSD interface requires strict character discipline and adherence to telecommunication standards.12 While GSM networks support up to 182 characters, cross-network compatibility dictates a strict limit of 160 characters per screen.12 Menus must remain shallow, following a three-to-four-click rule for primary transactions to prevent session timeouts, which typically occur after 30 to 60 seconds of user inactivity.2 Each screen must be limited to five or fewer choices to maintain readability.12  
To optimize completion rates, USSD configurations must favor an "unbundled" menu design where primary use cases are placed directly in the main menu, reducing the deep navigation trees that cause session drop-offs.12 Additionally, repeat power users can bypass menus entirely using direct USSD long codes, which compress the selection of actions, amounts, and recipients into a single, executable string.12

| UI Design Dimension | Mobile Single-Page App (SPA) | USSD Gateway Companion (\*123\#) |
| :---- | :---- | :---- |
| **Target Audience** | Smartphone owners; urban and semi-urban users 1 | Feature phone users; rural and data-conscious users 1 |
| **Data & Cost Profile** | Consumes mobile data; requires Wi-Fi or active cell coverage 2 | Zero data cost; completely free to navigate for the user 1 |
| **Interactive Elements** | WebGL, charts, live streams, maps, and sliding sheets 7 | Text-based menus; keyboard inputs using numbers (0-9), \*, and \# 10 |
| **Character Constraint** | Dynamic lazy-loading; no strict screen limit 4 | Strict 160-character limit per screen to prevent truncation 12 |
| **Interface Complexity** | Rich, dense layout prioritizing data legibility 18 | Extremely flat hierarchy; limited to 5 menu items per screen 12 |
| **Security Pattern** | Biometric login (FaceID/TouchID) and secure API tokens 7 | SIM-bound sessions with plain-text masked PIN confirmations 2 |
| **Transaction Flow** | Interactive bet slips, pre-filled values, and slider controls 19 | Quick-reply prompts; completed in 4 to 5 clicks maximum 12 |

## **USSD Screen Flow Architecture**

To implement a functional, secure USSD menu, the backend must accept parameters like session_id, session_msisdn (phone number), session_msg (user input), and session_operation (begin or continue).22 The system must respond with structured JSON payloads containing the menu text and the state of the session.22  
The following flow represents a complete, character-restricted USSD progression for a user accepting an active challenge. This structure adheres to the 160-character limit, contains navigation prompts (e.g., 0. Back), and positions secure PIN entry as the final, irreversible action.2

### **Screen 1: Main Menu (Begin Session)**

* **Actual Text (118 characters):**  
  DARE P2P  
  1. Active Dares (3)  
  2. My Wallet  
  3. Host Challenge  
  4. Trust Rating  
  5. Help  
  6. Exit  
* **JSON Response Payload:**  
```json
{
  "session_operation": "continue",
  "session_type": 1,
  "session_id": "987654321",
  "session_msg": "DARE P2P\\n1. Active Dares (3)\\n2. My Wallet\\n3. Host Challenge\\n4. Trust Rating\\n5. Help\\n00. Exit"
}
```

### **Screen 2: Active Dares Sub-Menu (User Inputs "1")**

* **Actual Text (132 characters):**  
  Select DARE to join:  
  1. ₦5k run (///filled.count.soap)  
  2. FIFA 26 Skill Match  
  3. Algorithmic Quiz  
  4. Back  
     *. Home  
* **JSON Response Payload:**  
```json
{
  "session_operation": "continue",
  "session_type": 1,
  "session_id": "987654321",
  "session_msg": "Select DARE to join:\\n1. ₦5k run (///filled.count.soap)\\n2. FIFA 26 Skill Match\\n3. Algorithmic Quiz\\n0. Back\\n*. Home"
}
```

### **Screen 3: Challenge Details and Escrow Notice (User Inputs "1")**

* **Actual Text (158 characters):**  
  DARE details:  
  Stake: ₦5,000  
  Rules: Complete 1km run.  
  Loc: ///filled.count.soap  
  Plat. Fee: ₦250  
  Accepting locks ₦5,250 in escrow.  
  1. Accept  
  2. Back  
* **JSON Response Payload:**  
```json
{
  "session_operation": "continue",
  "session_type": 1,
  "session_id": "987654321",
  "session_msg": "DARE details:\\nStake: ₦5,000\\nRules: Complete 1km run.\\nLoc: ///filled.count.soap\\nPlat. Fee: ₦250\\nAccepting locks ₦5,250 in escrow.\\n1. Accept\\n0. Back"
}
```

### **Screen 4: Secure PIN Authorization (User Inputs "1")**

* **Actual Text (115 characters):**  
  SECURE TRANSACTION  
  You are committing ₦5,250.  
  Enter your 4-digit DARE PIN to confirm:  
  (Your PIN is masked)  
  0. Cancel  
* **JSON Response Payload:**  
```json
{
  "session_operation": "continue",
  "session_type": 1,
  "session_id": "987654321",
  "session_msg": "SECURE TRANSACTION\\nYou are committing ₦5,250.\\nEnter your 4-digit DARE PIN to confirm:\\n(Your PIN is masked)\\n0. Cancel"
}
```

### **Screen 5: Receipt Confirmation and Session Close (User Inputs PIN)**

* **Actual Text (134 characters):**  
  DARE Accepted!  
  ₦5,250 locked in escrow.  
  Your Match ID is: #23A9.  
  Please navigate to your location to begin.  
  SMS receipt sent.  
* **JSON Response Payload:**  
```json
{
  "session_operation": "end",
  "session_type": 4,
  "session_id": "987654321",
  "session_msg": "DARE Accepted!\\n₦5,250 locked in escrow.\\nYour Match ID is: #23A9.\\nPlease navigate to your location to begin.\\nSMS receipt sent."
}
```

## **Secure Onboarding, Friction Budgeting, and Identity Verification**

The onboarding flow of any real-money gaming or fintech application represents the highest friction point in the user journey.23 Unlike lightweight SaaS products, the platform must execute robust Customer Due Diligence (CDD), KYC checks, and risk profiling while defending against multi-account creation, money laundering, and underage gaming.1 To mitigate drop-offs, the system must utilize "friction budgeting".23 This principle allocates friction selectively: it simplifies the initial sign-up to capture basic details while reserving comprehensive verifications for high-value actions, such as locking larger stakes or requesting withdrawals.8  
To optimize first-time user activation, the UI must adopt a "data-first" waterfall verification model, a technique successfully leveraged by market leaders like DraftKings.26 Instead of immediately forcing users to undergo document scans, the onboarding flow collects lightweight demographic data, such as a full name, date of birth, and phone number.24


The system takes this initial inputs and cross-references them across third-party KYC aggregators and national databases in the background, minimizing the need for manual document uploads.26 The user is immediately moved to active, lower-limit usage.23  
If background verification fails, or when a user crosses a regulatory transaction threshold, the interface dynamically triggers the physical document capture portal.23  
Integrating document verification within a mobile web or native application requires precise UX guardrails to prevent capture failures, which are the leading cause of user abandonment.27 Based on global logistical standards, such as those implemented in Uber's driver onboarding flow, the document capture UI must enforce strict image parameters.28  
The interface must feature a camera viewport with a high-contrast bounding box that dynamically changes color (e.g., from red to green) when it detects a document.30 Real-time, microcopy-driven instructions must appear directly above the viewport to guide the user:

* The document must be the physical original; photographs of photocopies, digital scans, or phone screenshots must be programmatically blocked.29  
* All four corners of the identity card must be clearly visible within the camera viewport boundaries to ensure document integrity.28  
* The image must be free of blur or reflective glare caused by poor camera focus or harsh overhead lighting.28

To verify that the person submitting the document is the legitimate owner, the flow must transition to a biometric selfie match with active liveness detection.27 The screen displays a circular framing guide with interactive Lottie animations, prompting the user to blink, turn their head, or move closer to verify a real, living presence.27  
If a capture issue occurs, the system must avoid displaying generic "Error Occurred" feedback.24 Instead, it should return highly descriptive, contextual corrections like "Photo is too dark. Try again with better lighting" or "All 4 corners not visible. Re-align card".24 Once submitted, a progress bar must display the verification status, accompanied by clear timeline expectations: "Verifying your details. This usually takes between 1 to 3 days".24

## **High-Trust Escrow and Fee Transparency Architecture**

In P2P wagering, trust is directly tied to financial legibility.1 The design of the transaction interface must ensure the user has complete clarity on when their money is locked, how it is partitioned, and the exact steps required for release.34  
When users enter the DARE Creation Wizard, they are guided through a structured five-step progression: Define Type, Select Category, Set Stakes, Edit Rules, and Final Review.1  
The Step 3 "Stakes" screen must utilize custom sliders, interactive inputs, and responsive layout tables to illustrate the escrow logic, replacing complex legal descriptions with interactive math.7  
The primary formula used to process the transaction fee is:

```text
processing_fee = (stake_amount * processor_rate) + fixed_processor_fee
```

The platform's net revenue is calculated by subtracting total processing fees from the platform fee or stake allocation:

```text
platform_net_revenue = platform_fee - processing_fee
```

In a P2P wager where both parties contribute equal stakes, the payout calculation must clearly display the deduction of the platform escrow rake:

```text
winner_payout = (stake_amount * 2) - platform_fee
```

The UI must visualize these equations dynamically.15 As a user moves the stake slider, the breakdown must display:

* The total amount debited from the user's wallet.  
* The portion allocated to the prize escrow.  
* The transaction processing fee.1  
* The net amount the winner will receive upon challenge resolution.1


The integration of payment processors like Paystack must occur exclusively via server-side verification to prevent client-side key exposure and transaction tampering.1 The frontend triggers a server call to initialize the checkout, receives a secure, short-lived access code, and launches the Paystack checkout wrapper over the SPA.1  
Once payment is completed, the backend must process the transaction asynchronously using webhooks, validating the payment payload with cryptographic verification:

```text
computed_signature = HMAC_SHA512(raw_body, PAYSTACK_SECRET_KEY)
computed_signature == x-paystack-signature
```

Only upon successful signature validation and an idempotent database transaction should the wallet balance be updated or the dare transition to an active state.1

| Transaction Component | UI Representation | Escrow State | Underlying Supabase Table |
| :---- | :---- | :---- | :---- |
| **Deposit** | Dynamic invoice card showing processing times, deposit method, and verification badge 1 | Pending verification -> Credited 1 | transactions 1 |
| **Escrow Hold** | Visual locking animation; prominent padlock indicator next to locked balances 18 | Locked in Platform Escrow; non-withdrawable 1 | escrow_holds 1 |
| **Platform Rake** | Transparent billing breakdown explaining platform fee splits 1 | Transfer to Operational Wallet upon match closure 1 | transactions 1 |
| **Payout** | Success banner with celebratory micro-animations and updated wallet totals 7 | Released to User Wallet; withdrawable 1 | transactions 1 |

## **Geospatial Precision and what3words Integration**

In environments lacking standardized addressing systems, traditional coordinates are difficult to communicate, causing errors and disputes in hyperlocal, location-based challenges.1 To address this challenge, the platform integrates high-precision geospatial services like what3words.1 By dividing the Earth's surface into a grid of 57 trillion 3m x 3m squares, the system allows challengers and runners to designate exact coordinates, such as a specific market stall, park bench, or starting line.1  
To maintain brand consistency and instant recognition, what3words integrations must follow strict style and formatting rules.39 An address must always be written in lowercase, separated by dots, and prefixed by three forward slashes with no spaces 39:  
`///filled.count.soap`  
The forward slashes (///) should be highlighted in red (red) or the application's primary accent color, and the address must be displayed in a clean, sans-serif font like Source Sans Pro to ensure high readability on low-end screens.39 When overlaying addresses on photograph cards or video evidence, they must be contained in a semi-transparent bounding box to ensure legibility against complex backdrops.39


The search interface must integrate an AutoSuggest component.40 Once the user types the first character of the third word, the system must display exactly three suggested results.40  
To provide context and prevent selection errors (since words can be orthographically similar across different countries), each suggestion must list the nearest geographic place name and the relative distance from the user's current GPS location, determined using the focus query parameter 40:  
`autosuggest?input=filled.count.s&focus=6.5244,3.3792`  
Once the user selects a suggestion, the address must be converted to standard coordinates using the convertToCoordinates wrapper, plotting a pin on the map and anchoring the challenge's physical boundary:  
`convertToCoordinates("///filled.count.soap")`

## **Live Court Page: Real-Time Synchronization and Sentiment**

The Live Court interface is the active arena where competitors, spectators, and administrators gather during a challenge.1 It is an intense, real-time environment that requires reliable backend synchronization.1  
To prevent UI freezes and visual lag under variable network conditions, the SPA maps these streams directly to lightweight broadcast and presence channels, ensuring updates are synchronized across all clients.1


For live wagers, the platform can adopt prediction market design principles pioneered by platforms like Polymarket.45 The core UI design principle is to prioritize probabilistic clarity over complex data dumps.45 Cent-based pricing (such as "90¢" or "$0.90" shares) is often confusing for casual players; therefore, the interface must display probability as the dominant visual metric (e.g., "90% chance").45  
Active event cards must be structured with binary, high-contrast action selectors (e.g., "YES / NO" options) and probability line graphs that track the evolution of public consensus as the live event unfolds.45 Clear, simple resolution criteria must remain visible above the fold, providing users with the exact parameters that dictate a win or loss.45  
Social betting mechanics can be enhanced by integrating "1-click copy betting" or "replicate wager" flows.1 Rather than forcing a spectator to navigate away from the live feed, find the market, and manually configure a bet, the feed should overlay an option to copy successful bettors.47  
The user journey for copying a bet requires a simple, three-step interaction:

1. **Spot a bet** on a public creator's profile card, complete with verified performance metrics such as Return on Investment (ROI), win rate, and historically tracked results.48  
2. **Tap the "Copy" icon**, which instantly loads the entire wager payload (with identical odds and configurations) into a pre-filled slip at the bottom of the screen.21  
3. **Adjust the slider** to set a personalized stake and tap "Confirm" to lock the copied bet.48

To maintain trust, the UI must display a clear verification badge next to any user whose historical betting results are pulled from live backend ledger records, distinguishing verified tipsters from unverified profiles.48  
All user interactions in the Live Court must write asynchronously to backend tables.1  

Database writes:

* `court_chat` for spectator comments.
* `dare_votes` for spectator live voting.
* `dare_quiz_answers` for algorithmic score tracking.

By separating chat messages, votes, and algorithmic inputs from transaction writes, the UI maintains high responsiveness and protects financial ledger entries from system bottlenecks.1

## **Restorative Justice, Decentralized Juries, and the Kleros Model**

When challenges face a dispute, the platform redirects the case from the standard court page to a dedicated "Jury" view.1 In Africa's social landscape, dispute resolution must align with traditional, community-focused principles of justice, such as Rwanda's Gacaca or Kenya's Njuri Ncheke, which focus on reconciliation and community consensus.1 The interface should translate these values into a modern, decentralized jury system.1  
DARE implements a decentralized adjudication workflow inspired by the game-theoretic principles of Kleros.1 When a player files a dispute, both parties submit their evidence through a secure upload portal.1 Jurors are drawn randomly from a staked pool of community members, where their likelihood of being selected is proportional to the number of tokens they have staked in that specific dispute category.50  
To ensure impartial decisions, the juror interface must be designed to minimize cognitive bias 1:

* The layout should feature a restricted, side-by-side split view comparing the challenge constitution (the immutable rules established during creation) with the submitted evidence packets.1  
* Jurors must be provided with simple, mutually exclusive voting options, such as "Rule for Challenger A," "Rule for Challenger B," or "Void/Refusal to Rule".50  
* To encourage objective analysis, jurors must write a clear justification of their reasoning in a secure markdown editor before their vote can be cast.49  
* Votes remain cryptographically committed and hidden from other jurors until the voting window closes, preventing herd mentality and vote manipulation.49

The dispute flow keeps escrow funds locked, collects evidence from both parties, routes the case into juror voting, tallies consensus, and then settles the escrow according to the final verdict.

Once the voting phase concludes, the system tallies the results.50 Coherent jurors, whose decision aligns with the majority consensus, are rewarded with a distribution of the dispute fees, while incoherent jurors lose a portion of their staked tokens, creating economic incentives to rule correctly.50  
All dispute transactions write to the jury_cases and jury_votes database tables, which can be reviewed on public dashboards to ensure platform transparency.1

## **State-Centric Compliance, Money Laundering, and Spending Controls**

Wagering platforms operate within complex regulatory environments.1 In Nigeria, following the Supreme Court's ruling that invalidated the National Lottery Act's federal jurisdiction, licensing has become state-centric, requiring compliance with individual state regimes like the Lagos State Lotteries and Gaming Authority (LSLGA).1 To secure state-level licensing, platforms must implement strict compliance and consumer protection features directly into the core user interface.1  
The platform must enforce the strict transaction limits of the Money Laundering Act, 2022, which restricts individual cash transfers outside financial institutions to ₦5,000,000 and corporate transactions to ₦10,000,000.1 To maintain compliance, the payment interface must programmatically limit single deposits or wagers below these limits, while requiring enhanced KYC and source-of-wealth validations if transaction volumes approach these values.1  
Furthermore, LSLGA guidelines emphasize responsible gaming and the strict prohibition of underage participation.1 To meet these requirements, the onboarding interface must include clear age-verification prompts, while the home feed must feature prominent responsible gaming alerts.1


The user settings dashboard must include robust consumer protection options 25:

* **Deposit and Loss Limits:** Users must be able to configure spending boundaries for daily, weekly, or monthly intervals.53 To prevent impulsive betting, lowering a spending limit must execute immediately, while raising or removing a limit must enforce a mandatory 24-hour cooling-off delay.55  
* **Reality Checks:** The app must periodically present non-intrusive notification overlays that display the user's active session duration, total wins, and total losses, prompting them to either log out or continue playing.55  
* **Self-Exclusion and Cool-Offs:** Users must be provided with easily accessible buttons to temporarily suspend their account (cool-off for 1 to 30 days) or permanently self-exclude from the platform.55  
* Once self-exclusion is activated, the system must immediately block logins, suppress push notifications, and stop all promotional outreach across email and SMS campaigns.53

## **Database Architecture and Real-Time State Synchronization**

To support this high-performance interface, the client-side SPA must integrate with a structured relational database and real-time synchronization channels.1  
The following database schema outlines the baseline structure required to maintain the challenge economy, map user actions to secure ledger accounts, and trigger real-time updates across live interfaces.1


### **Table 1: profiles**

* **Purpose:** Stores verified user identities, system tiers, trust scores, and ledger balances.  
* **Data Structure:**  
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    phone_msisdn VARCHAR(15) UNIQUE NOT NULL,
    trust_score INT DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 200),
    trust_tier VARCHAR(15) DEFAULT 'Bronze',
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    disputes_count INT DEFAULT 0,
    balance_kobo BIGINT DEFAULT 0, -- Stored as integer kobo to eliminate floating point errors
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Table 2: dares**

* **Purpose:** Tracks challenge parameters, rules, stakes, and current lifecycle states.  
* **Data Structure:**  
```sql
CREATE TABLE dares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_a_id UUID NOT NULL REFERENCES profiles(id),
    player_b_id UUID REFERENCES profiles(id), -- Nullable for open-ended wagers
    title VARCHAR(100) NOT NULL,
    constitution TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('algorithmic', 'witnessed', 'evidenced', 'honour')),
    category VARCHAR(30) NOT NULL,
    stake_kobo BIGINT NOT NULL,
    fee_kobo BIGINT NOT NULL,
    duration_seconds INT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'active', 'completed', 'disputed', 'settled')),
    winner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### **Table 3: transactions**

* **Purpose:** Immutable double-entry ledger logging cash flows, deposits, withdrawals, and payouts.  
* **Data Structure:**  
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    dare_id UUID REFERENCES dares(id), -- Nullable for standard deposit/withdrawal events
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'stake_lock', 'escrow_release', 'rake_deduction')),
    amount_kobo BIGINT NOT NULL,
    provider VARCHAR(20) DEFAULT 'Paystack',
    provider_ref VARCHAR(100) UNIQUE,
    status VARCHAR(15) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Table 4: escrow_holds**

* **Purpose:** Tracks funds temporarily held in platform escrow during active challenges.  
* **Data Structure:**  
```sql
CREATE TABLE escrow_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dare_id UUID NOT NULL REFERENCES dares(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount_kobo BIGINT NOT NULL,
    status VARCHAR(15) DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'disputed_hold')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE
);
```

### **Table 5: jury_cases**

* **Purpose:** Tracks active disputes routed to crowdsourced community juries.  
* **Data Structure:**  
```sql
CREATE TABLE jury_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dare_id UUID NOT NULL REFERENCES dares(id),
    filed_by_user_id UUID NOT NULL REFERENCES profiles(id),
    dispute_reason TEXT NOT NULL,
    status VARCHAR(15) DEFAULT 'open' CHECK (status IN ('open', 'voting', 'closed')),
    winner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);
```

### **Table 6: jury_votes**

* **Purpose:** Logs individual juror votes and their justifications.  
* **Data Structure:**  
```sql
CREATE TABLE jury_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jury_case_id UUID NOT NULL REFERENCES jury_cases(id),
    juror_user_id UUID NOT NULL REFERENCES profiles(id),
    vote VARCHAR(20) NOT NULL, -- 'PlayerA', 'PlayerB', or 'Void'
    rationale TEXT NOT NULL, -- Justification requirement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Table 7: dare_votes**

* **Purpose:** Captures spectator voting data during live "witnessed" challenges.  
* **Data Structure:**  
```sql
CREATE TABLE dare_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dare_id UUID NOT NULL REFERENCES dares(id),
    voter_user_id UUID NOT NULL REFERENCES profiles(id),
    vote VARCHAR(10) NOT NULL, -- 'PlayerA' or 'PlayerB'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Table 8: dare_quiz_answers**

* **Purpose:** Logs individual player answers for algorithmic challenge calculations.  
* **Data Structure:**  
```sql
CREATE TABLE dare_quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dare_id UUID NOT NULL REFERENCES dares(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    question_idx INT NOT NULL,
    answer_idx INT NOT NULL,
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Table 9: court_chat**

* **Purpose:** Stores spectators and players court room chat messages.  
* **Data Structure:**  
```sql
CREATE TABLE court_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dare_id UUID NOT NULL REFERENCES dares(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Table 10: notifications**

* **Purpose:** Triggers push notifications, email alerts, or SMS updates.  
* **Data Structure:**  
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    type VARCHAR(30) NOT NULL, -- 'dare_invited', 'payout_succeeded', 'dispute_filed'
    message TEXT NOT NULL,
    meta JSONB, -- Dynamic key-value metadata store
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## **Strategic System Mapping**

To ensure a cohesive architecture, the client-side SPA interfaces must align directly with these backend database tables and real-time state requirements.1  
The following mapping links each high-fidelity UI page, component, and modal to its underlying database entities and synchronization channels.1

| UI Page/Component | Primary Visual Interaction | Underlying DB Writes/Reads | Real-Time Sync Channel |
| :---- | :---- | :---- | :---- |
| **Auth Overlay** | High-contrast registration form and login inputs 1 | Insert into profiles; read login credentials 1 | None; HTTPS REST endpoint |
| **App Shell & Topbar** | Navigation tabs; notifications dropdown with badged totals 1 | Read from profiles and unread row totals in notifications 1 | Presence state tracking; live notify broadcasts 1 |
| **Feed Page** | Categorized list of challenges; filter controls 1 | Read from dares and profiles leaderboards 1 | Broadcasts of newly created and accepted dares 1 |
| **Create Page (Step 1-5)** | Stepper layout; interactive input forms and cost sliders 1 | Insert into dares; check wallet balances in profiles 1 | None; HTTPS REST endpoint |
| **Accept Modal** | Detailed view of the challenge rules and stake requirements 1 | Read from dares; insert lock transactions in escrow_holds 1 | Broadcast notification of opponent acceptance 1 |
| **Live Court Page** | Real-time synchronized match timer and competitor scores 1 | Read status from dares; insert to dare_votes and court_chat 1 | Full Presence and Broadcast channel sync for scoring and chat 1 |
| **Jury Page** | Blind review layout with evidence uploaders 1 | Read cases in jury_cases; insert decisions to jury_votes 1 | Broadcast notifications of case status changes 1 |
| **Wallet Page** | Transaction log listing, payment options, and withdrawal forms 1 | Read ledger in transactions; insert payment requests 1 | Instant callback triggers for verified webhooks 1 |

#### **Works cited**

1. Deep Technical & Product Analysis of the DARE Single-Page App Prototype.docx  
2. USSD Banking in Africa: Mobile Money Without Apps (2026), accessed May 24, 2026, [https://arkesel.com/ussd-financial-services-africa-mobile-money/](https://arkesel.com/ussd-financial-services-africa-mobile-money/)  
3. Top 10 UI UX Design Challenges in Sports Betting Apps and Websites - BR Softech, accessed May 24, 2026, [https://www.brsoftech.com/blog/10-ui-ux-design-challenges-in-sports-betting-app/](https://www.brsoftech.com/blog/10-ui-ux-design-challenges-in-sports-betting-app/)  
4. Designing UX for Low-Connectivity: Pro Tips | 2026 - Bits Kingdom, accessed May 24, 2026, [https://bitskingdom.com/blog/designing-ux-for-low-connectivity/](https://bitskingdom.com/blog/designing-ux-for-low-connectivity/)  
5. UX for Low-Bandwidth & Offline Use: Designing for the Edge | by Vxplore, accessed May 24, 2026, [https://vxplore.medium.com/ux-for-low-bandwidth-offline-use-designing-for-the-edge-0926259f2c08](https://vxplore.medium.com/ux-for-low-bandwidth-offline-use-designing-for-the-edge-0926259f2c08)  
6. UX/UI Design Trends for iGaming Applications in 2025 - The Betting Coach, accessed May 24, 2026, [https://www.thebettingcoach.com/en/2025/02/10/ux-ui-design-trends-for-igaming-applications-in-2025/](https://www.thebettingcoach.com/en/2025/02/10/ux-ui-design-trends-for-igaming-applications-in-2025/)  
7. Fintech design guide with patterns that build trust [2026] - Eleken, accessed May 24, 2026, [https://www.eleken.co/blog-posts/modern-fintech-design-guide](https://www.eleken.co/blog-posts/modern-fintech-design-guide)  
8. UX & UI in Sports Betting - Is the Interface Holding Players Back? - Uplatform, accessed May 24, 2026, [https://uplatform.com/news/ux-ui-in-sports-betting-is-the-interface-holding-players-back](https://uplatform.com/news/ux-ui-in-sports-betting-is-the-interface-holding-players-back)  
9. 10 Mobile App Design Best Practices for Product Teams - RapidNative, accessed May 24, 2026, [https://www.rapidnative.com/blogs/mobile-app-design-best-practices](https://www.rapidnative.com/blogs/mobile-app-design-best-practices)  
10. 5 ways to optimize UX in USSD applications. | by destiny ihejirika | Bootcamp - Medium, accessed May 24, 2026, [https://medium.com/design-bootcamp/5-ways-to-optimize-ux-in-ussd-applications-7fb03ef55ec8](https://medium.com/design-bootcamp/5-ways-to-optimize-ux-in-ussd-applications-7fb03ef55ec8)  
11. USSD Explained: How Companies Use It to Engage Customers (2025) - Beem Africa, accessed May 24, 2026, [https://beem.africa/blog/how-companies-use-ussd-to-engage-customers/](https://beem.africa/blog/how-companies-use-ussd-to-engage-customers/)  
12. USSD Menu Design: 10 Best Practices for Higher Completion Rates - Arkesel, accessed May 24, 2026, [https://arkesel.com/ussd-menu-design-best-practices/](https://arkesel.com/ussd-menu-design-best-practices/)  
13. Designing User-Friendly USSD Interface for Digital Financial Services, accessed May 24, 2026, [https://www.microsave.net/2017/04/07/designing-user-friendly-ussd-interface-for-digital-financial-services/](https://www.microsave.net/2017/04/07/designing-user-friendly-ussd-interface-for-digital-financial-services/)  
14. Designing an Effective User Interface for USSD: Part2 - MicroSave Consulting (MSC), accessed May 24, 2026, [https://www.microsave.net/2015/09/15/designing-an-effective-user-interface-for-ussd-part2/](https://www.microsave.net/2015/09/15/designing-an-effective-user-interface-for-ussd-part2/)  
15. The fintech ROI calculator: your most powerful sales tool to 10x your conversions, accessed May 24, 2026, [https://www.patrickhuijs.com/blog/fintech-roi-calculator](https://www.patrickhuijs.com/blog/fintech-roi-calculator)  
16. Using the Web Map Component - what3words API, accessed May 24, 2026, [https://developer.what3words.com/tutorial/using-the-web-map-component](https://developer.what3words.com/tutorial/using-the-web-map-component)  
17. Information architecture of the mobile-banking UI design - ResearchGate, accessed May 24, 2026, [https://www.researchgate.net/figure/nformation-architecture-of-the-mobile-banking-UI-design_fig2_221518457](https://www.researchgate.net/figure/nformation-architecture-of-the-mobile-banking-UI-design_fig2_221518457)  
18. Fintech UI/UX Design: Best Practices for Financial Apps in 2026 - The Skins Factory, accessed May 24, 2026, [https://www.theskinsfactory.com/uiux-design-blog/fintech-ui-ux-design](https://www.theskinsfactory.com/uiux-design-blog/fintech-ui-ux-design)  
19. Sports Betting UI Templates and Projects - SourceCodeLab, accessed May 24, 2026, [https://sourcecodelab.co/sports-betting-ui-templates-and-projects/](https://sourcecodelab.co/sports-betting-ui-templates-and-projects/)  
20. FinTech App Development Cost: Detailed Estimation for 2026 - Cleveroad, accessed May 24, 2026, [https://www.cleveroad.com/blog/fintech-app-development-cost/](https://www.cleveroad.com/blog/fintech-app-development-cost/)  
21. Sportsbook UX: Create Immersive Sports Betting App Experiences - Symphony Solutions, accessed May 24, 2026, [https://symphony-solutions.com/insights/sportsbook-ux](https://symphony-solutions.com/insights/sportsbook-ux)  
22. USSD MENU, accessed May 24, 2026, [https://strowallet.readme.io/reference/ussd-menu](https://strowallet.readme.io/reference/ussd-menu)  
23. Fintech onboarding: 6 UX practices that reduce drop-off - Eleken, accessed May 24, 2026, [https://www.eleken.co/blog-posts/fintech-onboarding-simplification](https://www.eleken.co/blog-posts/fintech-onboarding-simplification)  
24. Fintech mobile app onboarding checklist - Goodface agency, accessed May 24, 2026, [https://goodface.agency/insight/fintech-mobile-app-onboarding-checklist/](https://goodface.agency/insight/fintech-mobile-app-onboarding-checklist/)  
25. What is Responsible Gaming? - Sumsub, accessed May 24, 2026, [https://sumsub.com/blog/responsible-gaming/](https://sumsub.com/blog/responsible-gaming/)  
26. How DraftKings Keeps Onboarding Security Swift And Out Of Sight - PYMNTS.com, accessed May 24, 2026, [https://www.pymnts.com/digital-onboarding/2019/draftkings-sports-betting-identity-verification-security/](https://www.pymnts.com/digital-onboarding/2019/draftkings-sports-betting-identity-verification-security/)  
27. How to Design Digital Onboarding for Banks & Fintechs, accessed May 24, 2026, [https://www.onething.design/post/digital-onboarding-designing-for-banks-fintechs](https://www.onething.design/post/digital-onboarding-designing-for-banks-fintechs)  
28. How to upload documents | Driving & Delivering - Uber Help, accessed May 24, 2026, [https://help.uber.com/en/driving-and-delivering/article/how-to-upload-documents?nodeId=b16a5c0b-ad3f-438a-9beb-58266b2d54aa](https://help.uber.com/en/driving-and-delivering/article/how-to-upload-documents?nodeId=b16a5c0b-ad3f-438a-9beb-58266b2d54aa)  
29. 2.1 - How to upload your documents | Driving & Delivering - Help | Uber, accessed May 24, 2026, [https://help.uber.com/am/driving-and-delivering/article/21---how-to-upload-your-documents?nodeId=9d0810d2-93cb-4559-b43a-4cfaab94c323](https://help.uber.com/am/driving-and-delivering/article/21---how-to-upload-your-documents?nodeId=9d0810d2-93cb-4559-b43a-4cfaab94c323)  
30. Simple UX tricks to boost onboarding & KYC conversion - GitHub, accessed May 24, 2026, [https://github.com/ballerine-io/ballerine/wiki/Simple-UX-tricks-to-boost-onboarding-&-KYC-conversion](https://github.com/ballerine-io/ballerine/wiki/Simple-UX-tricks-to-boost-onboarding-&-KYC-conversion)  
31. File upload - Base design system - Uber, accessed May 24, 2026, [https://base.uber.com/6d2425e9f/p/5555b5-file-upload/b/978665](https://base.uber.com/6d2425e9f/p/5555b5-file-upload/b/978665)  
32. You can learn how to upload the documents on the Uber Driver App - YouTube, accessed May 24, 2026, [https://www.youtube.com/watch?v=yRSkS2A6ng0](https://www.youtube.com/watch?v=yRSkS2A6ng0)  
33. Uploading documents | Driving & Delivering - Help | Uber, accessed May 24, 2026, [https://help.uber.com/en/driving-and-delivering/article/uploading-documents?nodeId=d24c406d-e470-40f1-867d-3a8db1bbfd48](https://help.uber.com/en/driving-and-delivering/article/uploading-documents?nodeId=d24c406d-e470-40f1-867d-3a8db1bbfd48)  
34. Fintech UX Design: Principles, Patterns, and Trends | Ramotion Agency, accessed May 24, 2026, [https://www.ramotion.com/blog/fintech-ux-design/](https://www.ramotion.com/blog/fintech-ux-design/)  
35. Fintech UX Design: How to Build Trust in Financial Apps, accessed May 24, 2026, [https://www.yujdesigns.com/blog/fintech-ux-design/](https://www.yujdesigns.com/blog/fintech-ux-design/)  
36. How to Calculate Transaction Fees: Formula and Examples | Airwallex, accessed May 24, 2026, [https://www.airwallex.com/uk/blog/how-to-calculate-transaction-fees](https://www.airwallex.com/uk/blog/how-to-calculate-transaction-fees)  
37. Designing for Trust, Security, and Compliance in FinTech UX | Blog - Goji Labs, accessed May 24, 2026, [https://gojilabs.com/blog/designing-for-trust-security-and-compliance-in-fintech-ux/](https://gojilabs.com/blog/designing-for-trust-security-and-compliance-in-fintech-ux/)  
38. What3words - Wikipedia, accessed May 24, 2026, [https://en.wikipedia.org/wiki/What3words](https://en.wikipedia.org/wiki/What3words)  
39. Formatting Best Practice | Design - what3words API, accessed May 24, 2026, [https://developer.what3words.com/design/formatting-best-practice](https://developer.what3words.com/design/formatting-best-practice)  
40. UX guidelines - what3words API, accessed May 24, 2026, [https://developer.what3words.com/tutorial/ux-guidelines](https://developer.what3words.com/tutorial/ux-guidelines)  
41. Maker guidelines | Design - what3words API, accessed May 24, 2026, [https://developer.what3words.com/design/maker-guidelines](https://developer.what3words.com/design/maker-guidelines)  
42. Brand Basics | Design - what3words API, accessed May 24, 2026, [https://developer.what3words.com/design/brand-basics](https://developer.what3words.com/design/brand-basics)  
43. Using the JavaScript AutoSuggest Component - what3words API, accessed May 24, 2026, [https://developer.what3words.com/tutorial/javascript-autosuggest-component](https://developer.what3words.com/tutorial/javascript-autosuggest-component)  
44. Navigation - what3words API, accessed May 24, 2026, [https://developer.what3words.com/tutorial/navigation](https://developer.what3words.com/tutorial/navigation)  
45. What Are the Best UX/UI Patterns for Prediction Markets in 2026? Full Design Guide - Avark, accessed May 24, 2026, [https://avark.agency/learn/prediction-market-design-patterns](https://avark.agency/learn/prediction-market-design-patterns)  
46. What is Polymarket? A guide to decentralized prediction markets - MetaMask, accessed May 24, 2026, [https://metamask.io/news/what-is-polymarket-guide-to-decentralized-prediction-markets](https://metamask.io/news/what-is-polymarket-guide-to-decentralized-prediction-markets)  
47. Is "social betting" (like copy trading for bets) actually worth building into sportsbooks? : r/gambling - Reddit, accessed May 24, 2026, [https://www.reddit.com/r/gambling/comments/1sm2eoi/is_social_betting_like_copy_trading_for_bets/](https://www.reddit.com/r/gambling/comments/1sm2eoi/is_social_betting_like_copy_trading_for_bets/)  
48. Copy Sports Bets from Winning Bettors with One Tap | Pikkit, accessed May 24, 2026, [https://pikkit.com/copy-bets](https://pikkit.com/copy-bets)  
49. Kleros Development Update: September 2025, accessed May 24, 2026, [https://blog.kleros.io/kleros-development-update-september-2025/](https://blog.kleros.io/kleros-development-update-september-2025/)  
50. Whitepapers - Kleros, accessed May 24, 2026, [https://kleros.io/whitepaper.pdf](https://kleros.io/whitepaper.pdf)  
51. The Kleros Juror Starter Kit, accessed May 24, 2026, [https://blog.kleros.io/the-kleros-juror-starter-kit/](https://blog.kleros.io/the-kleros-juror-starter-kit/)  
52. Kleros Development Update: May 2025, accessed May 24, 2026, [https://blog.kleros.io/kleros-development-update-may-2025/](https://blog.kleros.io/kleros-development-update-may-2025/)  
53. Responsible Gaming Guide: Responsible Gambling Tools & Tips - Avenga, accessed May 24, 2026, [https://www.avenga.com/magazine/responsible-gambling/](https://www.avenga.com/magazine/responsible-gambling/)  
54. Sportsbook UX Design Tips | Create Winning Live Play Betting Experiences - Altenar, accessed May 24, 2026, [https://altenar.com/blog/how-to-design-a-sportsbook-user-experience-ux-that-wins-in-live-play/](https://altenar.com/blog/how-to-design-a-sportsbook-user-experience-ux-that-wins-in-live-play/)  
55. What is responsible gambling? Limits, self-exclusion, and protection | The Jerusalem Post, accessed May 24, 2026, [https://www.jpost.com/consumerism/article-894726](https://www.jpost.com/consumerism/article-894726)  
56. Responsible Gaming Regulations and Statutes Guide - American Gaming Association, accessed May 24, 2026, [https://www.americangaming.org/resources/responsible-gaming-regulations-and-statutes-guide/](https://www.americangaming.org/resources/responsible-gaming-regulations-and-statutes-guide/)  
57. Sports Betting App UX & UI in 2026: Creating an Intuitive, High-Engagement Experience, accessed May 24, 2026, [https://prometteursolutions.com/blog/user-experience-and-interface-in-sports-betting-apps/](https://prometteursolutions.com/blog/user-experience-and-interface-in-sports-betting-apps/)
