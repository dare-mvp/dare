-- ============================================================
-- seed.sql
-- Development seed data. NEVER run in production.
-- Production data (quiz questions, admin user) must be loaded
-- through a separate secure process.
--
-- Includes:
--   - dare_categories (can be applied to production)
--   - sample quiz questions (50+ knowledge, 25 sports, 25 verbal)
--   - system wallet account setup note
--   - local dev test user UUIDs (Supabase Studio only)
-- ============================================================

-- ── Dare categories ──────────────────────────────────────────
-- These are safe to apply in any environment.
insert into dare_categories (id, label, icon, active, sort_order) values
  ('knowledge',  'Knowledge',  '🧠', true, 1),
  ('physical',   'Physical',   '💪', true, 2),
  ('verbal',     'Verbal',     '💬', true, 3),
  ('sports',     'Sports',     '⚽', true, 4),
  ('creative',   'Creative',   '🎨', true, 5),
  ('other',      'Other',      '⚡', true, 6)
on conflict (id) do nothing;

-- ── Quiz questions — Knowledge ────────────────────────────────
-- Format: options is a JSON array of strings [0..N-1]; correct_option is 0-based index.

insert into quiz_questions (category, prompt, options, correct_option, difficulty) values
-- Easy knowledge
('knowledge', 'What is the capital city of Nigeria?',
 '["Lagos","Abuja","Kano","Port Harcourt"]', 1, 'easy'),

('knowledge', 'How many states are in Nigeria?',
 '["30","36","42","48"]', 1, 'easy'),

('knowledge', 'Which ocean borders the west coast of Africa?',
 '["Indian Ocean","Atlantic Ocean","Pacific Ocean","Arctic Ocean"]', 1, 'easy'),

('knowledge', 'What is the currency of Kenya?',
 '["Naira","Cedi","Shilling","Rand"]', 2, 'easy'),

('knowledge', 'Which planet is closest to the Sun?',
 '["Venus","Earth","Mars","Mercury"]', 3, 'easy'),

('knowledge', 'How many continents are there on Earth?',
 '["5","6","7","8"]', 2, 'easy'),

('knowledge', 'What gas do plants absorb from the air during photosynthesis?',
 '["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"]', 2, 'easy'),

('knowledge', 'What is the largest organ in the human body?',
 '["Heart","Liver","Skin","Lungs"]', 2, 'easy'),

('knowledge', 'Which country invented football (soccer)?',
 '["Brazil","Spain","England","France"]', 2, 'easy'),

('knowledge', 'How many sides does a hexagon have?',
 '["5","6","7","8"]', 1, 'easy'),

-- Normal knowledge
('knowledge', 'What does DNA stand for?',
 '["Deoxyribonucleic Acid","Dynamic Nucleic Acid","Dual Nitrogen Array","Digital Nucleotide Assembly"]', 0, 'normal'),

('knowledge', 'Who wrote the play Romeo and Juliet?',
 '["Charles Dickens","William Shakespeare","Leo Tolstoy","Mark Twain"]', 1, 'normal'),

('knowledge', 'In which year did Nigeria gain independence?',
 '["1955","1960","1963","1970"]', 1, 'normal'),

('knowledge', 'What is the chemical symbol for gold?',
 '["Go","Gd","Au","Ag"]', 2, 'normal'),

('knowledge', 'The Great Wall of China was primarily built during which dynasty?',
 '["Tang","Song","Ming","Han"]', 2, 'normal'),

('knowledge', 'What is the speed of light in kilometres per second (approximate)?',
 '["150,000","300,000","500,000","1,000,000"]', 1, 'normal'),

('knowledge', 'How many bones are in the adult human body?',
 '["196","206","216","226"]', 1, 'normal'),

('knowledge', 'What is the largest country in Africa by land area?',
 '["Nigeria","Sudan","Democratic Republic of Congo","Algeria"]', 3, 'normal'),

('knowledge', 'Which programming language was created by Guido van Rossum?',
 '["Java","Python","Ruby","C++"]', 1, 'normal'),

('knowledge', 'What is the powerhouse of the cell?',
 '["Nucleus","Ribosome","Mitochondria","Golgi Apparatus"]', 2, 'normal'),

('knowledge', 'Mount Kilimanjaro is located in which country?',
 '["Kenya","Ethiopia","Uganda","Tanzania"]', 3, 'normal'),

('knowledge', 'What is the hardest natural substance on Earth?',
 '["Platinum","Quartz","Diamond","Titanium"]', 2, 'normal'),

('knowledge', 'In which year did the first moon landing occur?',
 '["1965","1967","1969","1971"]', 2, 'normal'),

('knowledge', 'What is the largest ocean on Earth?',
 '["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"]', 3, 'normal'),

('knowledge', 'Which element has the atomic number 1?',
 '["Helium","Hydrogen","Oxygen","Carbon"]', 1, 'normal'),

-- Hard knowledge
('knowledge', 'What is the Krebs cycle also known as?',
 '["Glycolysis cycle","Citric acid cycle","Electron transport chain","Calvin cycle"]', 1, 'hard'),

('knowledge', 'Which African country was never colonised by a European power?',
 '["Ghana","Senegal","Ethiopia","Kenya"]', 2, 'hard'),

('knowledge', 'What is the name of the treaty that established the African Union?',
 '["Lagos Accord","Lusaka Protocol","Constitutive Act of the African Union","Abuja Treaty"]', 2, 'hard'),

('knowledge', 'In economics, what does the Gini coefficient measure?',
 '["GDP growth rate","Income inequality","Unemployment rate","Inflation rate"]', 1, 'hard'),

('knowledge', 'What is the half-life of Carbon-14?',
 '["1,430 years","5,730 years","10,000 years","23,000 years"]', 1, 'hard');

-- ── Quiz questions — Sports ───────────────────────────────────

insert into quiz_questions (category, prompt, options, correct_option, difficulty) values
('sports', 'How many players are on a standard football (soccer) team?',
 '["9","10","11","12"]', 2, 'easy'),

('sports', 'Which country has won the most FIFA World Cup titles?',
 '["Germany","Argentina","Brazil","France"]', 2, 'easy'),

('sports', 'How many points is a try worth in rugby union?',
 '["3","4","5","7"]', 2, 'easy'),

('sports', 'In which sport would you perform a slam dunk?',
 '["Volleyball","Basketball","Tennis","Handball"]', 1, 'easy'),

('sports', 'How many holes are on a standard golf course?',
 '["9","12","18","21"]', 2, 'easy'),

('sports', 'Who holds the record for the most Olympic gold medals?',
 '["Usain Bolt","Michael Phelps","Carl Lewis","Simone Biles"]', 1, 'normal'),

('sports', 'What colour jersey does the winner wear in the Tour de France?',
 '["Red","White","Yellow","Green"]', 2, 'normal'),

('sports', 'In which city were the 2016 Summer Olympics held?',
 '["Tokyo","London","Rio de Janeiro","Athens"]', 2, 'normal'),

('sports', 'Which African country was the first to host the FIFA World Cup?',
 '["Egypt","Morocco","South Africa","Nigeria"]', 2, 'normal'),

('sports', 'How long is a standard marathon in kilometres?',
 '["40","42.195","44","45.5"]', 1, 'normal'),

('sports', 'In cricket, what is the maximum number of runs scored from a single delivery without extras?',
 '["4","6","8","10"]', 1, 'hard'),

('sports', 'The Thomas Cup is awarded in which sport?',
 '["Table Tennis","Squash","Badminton","Tennis"]', 2, 'hard'),

('sports', 'Which sprinter set the 100m world record of 9.58 seconds?',
 '["Yohan Blake","Justin Gatlin","Asafa Powell","Usain Bolt"]', 3, 'hard'),

('sports', 'In which year was the first Africa Cup of Nations (AFCON) held?',
 '["1957","1960","1963","1965"]', 0, 'hard'),

('sports', 'What does the abbreviation VAR stand for in football?',
 '["Video Assisted Replay","Video Assistant Referee","Visual Accuracy Review","Video Action Rule"]', 1, 'normal');

-- ── Quiz questions — Verbal / Logic ──────────────────────────

insert into quiz_questions (category, prompt, options, correct_option, difficulty) values
('verbal', 'If all roses are flowers and some flowers fade quickly, which statement must be true?',
 '["All roses fade quickly","Some roses may fade quickly","No roses fade quickly","All flowers are roses"]', 1, 'normal'),

('verbal', 'Complete the analogy: Book is to Read as Meal is to _____',
 '["Cook","Taste","Eat","Serve"]', 2, 'easy'),

('verbal', 'Which word is the odd one out? Apple, Banana, Carrot, Mango',
 '["Apple","Banana","Carrot","Mango"]', 2, 'easy'),

('verbal', 'If you rearrange the letters "CIFAIPC", you get the name of a what?',
 '["Country","Ocean","Mountain","River"]', 1, 'normal'),

('verbal', 'A farmer has 17 sheep. All but 9 die. How many sheep does the farmer have left?',
 '["8","9","17","0"]', 1, 'easy'),

('verbal', 'Which proverb means "actions speak louder than words"?',
 '["The pen is mightier than the sword","Better late than never","The proof of the pudding is in the eating","Empty vessels make the most noise"]', 2, 'normal'),

('verbal', 'What is the next number in the sequence: 2, 6, 18, 54, ___?',
 '["108","162","216","324"]', 1, 'normal'),

('verbal', 'Sarah is taller than Jane. Jane is taller than Mary. Who is the shortest?',
 '["Sarah","Jane","Mary","Cannot determine"]', 2, 'easy'),

('verbal', 'If a clock shows 3:15, what is the angle between the hour and minute hands?',
 '["0 degrees","7.5 degrees","22.5 degrees","45 degrees"]', 1, 'hard'),

('verbal', 'Which of the following is an example of a logical fallacy?',
 '["If it rains, the ground gets wet","All mammals breathe air; dogs are mammals; dogs breathe air","You should not trust his opinion because he is poor","All observed swans are white; therefore all swans are white"]', 2, 'hard'),

('verbal', 'A train travels from city A to city B at 60 km/h and returns at 40 km/h. What is the average speed?',
 '["48 km/h","50 km/h","52 km/h","55 km/h"]', 0, 'hard'),

('verbal', 'Synonyms: Choose the word closest in meaning to "Ephemeral"',
 '["Permanent","Transient","Ancient","Powerful"]', 1, 'normal'),

('verbal', 'Which word does NOT belong: Symphony, Sonata, Opera, Palette?',
 '["Symphony","Sonata","Opera","Palette"]', 3, 'normal'),

('verbal', 'If FRIEND is coded as GSJFOE, how is ENEMY coded?',
 '["FOFNZ","FNFNZ","FNEOF","FOENZ"]', 0, 'hard'),

('verbal', 'Complete the sentence: The more you practice, the _____ you become.',
 '["good","better","best","well"]', 1, 'easy');

-- ── Platform wallet note ──────────────────────────────────────
-- GAP-07 resolution: A platform fee wallet account requires a
-- corresponding auth.users entry and profiles row. This cannot be
-- seeded automatically because it requires Supabase Auth.
--
-- Post-deploy setup steps:
--   1. Use Supabase Dashboard > Authentication to create a user with
--      email: system@internal.dare (mark email_confirmed = true)
--   2. Note the resulting auth.users UUID
--   3. Insert profile:
--      INSERT INTO profiles (id, username, display_name, is_admin, account_status)
--      VALUES ('<uuid>', 'system', 'DARE Platform', false, 'active');
--   4. Insert wallet account:
--      INSERT INTO wallet_accounts (user_id, currency, status)
--      VALUES ('<uuid>', 'NGN', 'active');
--   5. Record the wallet_account.id as the PLATFORM_FEE_WALLET_ID
--      in your Edge Function environment variables.

-- ── Dev test user setup note ──────────────────────────────────
-- For local Supabase (supabase start), create test users via:
--   supabase/seed/create_dev_users.sh  (to be written separately)
-- Or use Supabase Studio at http://localhost:54323
--
-- Suggested local test users:
--   issuer@test.dare    — creates and issues DAREs
--   challenger@test.dare — accepts and plays DAREs
--   juror@test.dare     — jury_opt_in = true, participates in jury
--   spectator@test.dare — watches only
--   admin@test.dare     — is_admin = true
--
-- After auth user creation, insert profiles:
-- (replace UUIDs with actual values from auth.users)
--
-- INSERT INTO profiles (id, username, display_name, jury_opt_in, account_status)
-- VALUES
--   ('<issuer-uuid>',     'issuer_dev',     'Issuer Dev',     false, 'active'),
--   ('<challenger-uuid>', 'challenger_dev', 'Challenger Dev', false, 'active'),
--   ('<juror-uuid>',      'juror_dev',      'Juror Dev',      true,  'active'),
--   ('<spectator-uuid>',  'spectator_dev',  'Spectator Dev',  false, 'active'),
--   ('<admin-uuid>',      'admin_dev',      'Admin Dev',      false, 'active');
--
-- UPDATE profiles SET is_admin = true WHERE username = 'admin_dev';
--
-- Then create wallet accounts for each:
-- INSERT INTO wallet_accounts (user_id, currency)
-- SELECT id, 'NGN' FROM profiles WHERE account_status = 'active';
