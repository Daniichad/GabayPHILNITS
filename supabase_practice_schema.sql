-- =============================================================================
-- GabayPHILCSE - Practice Module Schema  (v2 - aligned to existing tables)
-- Run this entire script in the Supabase SQL Editor (once).
--
-- Existing tables observed:
--   public.users         (id BIGINT, role TEXT)   <- admin source
--   auth.users           (id UUID)                <- regular user source
--   diagnostic_assessment_attempts (user_id UUID -> auth.users)
--   personal_info        (user_id UUID -> auth.users)
--   todos                (user_id UUID -> auth.users)
--
-- Design decisions:
--   admin_id  BIGINT  -> public.users(id)  WHERE role = 'admin'
--   user_id   UUID    -> auth.users(id)    (consistent with existing tables)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ===========================================================================
-- SECTION 1 - CONTENT TABLES  (admin_id BIGINT -> public.users)
-- ===========================================================================

-- 1. practice_categories
CREATE TABLE IF NOT EXISTS practice_categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,

    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT,
    icon        TEXT,
    color       TEXT        DEFAULT '#3B82B8',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE practice_categories IS
    'Top-level subject categories. admin_id references public.users (role=admin).';

-- 2. flashcard_decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id     UUID        REFERENCES practice_categories(id) ON DELETE SET NULL,

    title           TEXT        NOT NULL,
    description     TEXT,
    icon            TEXT,
    total_cards     INT         NOT NULL DEFAULT 0,
    difficulty      TEXT        CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flashcard_decks IS
    'Named flashcard sets. admin_id references public.users (role=admin).';

-- 3. flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id     UUID        NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    admin_id    BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    term        TEXT        NOT NULL,
    definition  TEXT        NOT NULL,
    hint        TEXT,
    sort_order  INT         NOT NULL DEFAULT 0,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flashcards IS
    'Individual flashcard items. admin_id references public.users (role=admin).';

-- 4. multiple_choice_questions
CREATE TABLE IF NOT EXISTS multiple_choice_questions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id     UUID        REFERENCES practice_categories(id) ON DELETE SET NULL,

    prompt          TEXT        NOT NULL,
    options         JSONB       NOT NULL,
    -- options: ["Option A", "Option B", "Option C", ...]
    correct_index   SMALLINT    NOT NULL,
    explanation     TEXT,
    difficulty      TEXT        CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    sort_order      INT         NOT NULL DEFAULT 0,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE multiple_choice_questions IS
    'MCQ questions with JSONB options array. admin_id references public.users.';

-- 5. true_false_questions
CREATE TABLE IF NOT EXISTS true_false_questions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id     UUID        REFERENCES practice_categories(id) ON DELETE SET NULL,

    statement       TEXT        NOT NULL,
    answer          BOOLEAN     NOT NULL,
    explanation     TEXT,
    difficulty      TEXT        CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    sort_order      INT         NOT NULL DEFAULT 0,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE true_false_questions IS
    'True/False questions. admin_id references public.users.';

-- 6. matching_pairs
CREATE TABLE IF NOT EXISTS matching_pairs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id     UUID        REFERENCES practice_categories(id) ON DELETE SET NULL,

    set_title       TEXT        NOT NULL,
    term            TEXT        NOT NULL,
    definition      TEXT        NOT NULL,
    sort_order      INT         NOT NULL DEFAULT 0,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE matching_pairs IS
    'Term-definition pairs for the matching game. admin_id references public.users.';

-- 7. mock_exam_configs
CREATE TABLE IF NOT EXISTS mock_exam_configs (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id            BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    level_key           TEXT        NOT NULL UNIQUE,
    -- 'professional' | 'sub_professional'
    title               TEXT        NOT NULL,
    subtitle            TEXT,
    tag                 TEXT,
    total_questions     INT         NOT NULL,
    time_limit_seconds  INT         NOT NULL,
    sections            JSONB,
    -- [{"name": "Verbal Ability", "description": "..."}, ...]
    is_published        BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mock_exam_configs IS
    'Mock exam level config (Professional / Sub-Professional). admin_id -> public.users.';

-- 8. mock_exam_questions
CREATE TABLE IF NOT EXISTS mock_exam_questions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        BIGINT      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    config_id       UUID        NOT NULL REFERENCES mock_exam_configs(id) ON DELETE CASCADE,

    section_name    TEXT        NOT NULL,
    prompt          TEXT        NOT NULL,
    options         JSONB       NOT NULL,
    correct_index   SMALLINT    NOT NULL,
    explanation     TEXT,
    sort_order      INT         NOT NULL DEFAULT 0,
    is_published    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mock_exam_questions IS
    'Mock exam questions. admin_id -> public.users. config_id -> mock_exam_configs.';


-- ===========================================================================
-- SECTION 2 - RESULTS / LOG TABLES  (user_id UUID -> auth.users)
-- Consistent with: diagnostic_assessment_attempts, personal_info, todos
-- ===========================================================================

-- 9. flashcard_sessions
CREATE TABLE IF NOT EXISTS flashcard_sessions (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_id          UUID        NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,

    cards_seen       INT         NOT NULL DEFAULT 0,
    cards_total      INT         NOT NULL DEFAULT 0,
    completed        BOOLEAN     NOT NULL DEFAULT FALSE,
    duration_seconds INT,

    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ
);

COMMENT ON TABLE flashcard_sessions IS
    'User flashcard session log. user_id -> auth.users (UUID, same as other result tables).';

-- 10. multiple_choice_results
CREATE TABLE IF NOT EXISTS multiple_choice_results (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES multiple_choice_questions(id) ON DELETE CASCADE,

    selected_index  SMALLINT,
    -- NULL = skipped
    is_correct      BOOLEAN,
    time_taken_ms   INT,

    answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE multiple_choice_results IS
    'Per-answer MCQ log. user_id -> auth.users.';

-- 11. true_false_results
CREATE TABLE IF NOT EXISTS true_false_results (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES true_false_questions(id) ON DELETE CASCADE,

    selected_answer BOOLEAN,
    -- NULL = skipped
    is_correct      BOOLEAN,
    time_taken_ms   INT,

    answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE true_false_results IS
    'Per-answer True/False log. user_id -> auth.users.';

-- 12. matching_results
CREATE TABLE IF NOT EXISTS matching_results (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id      UUID        REFERENCES practice_categories(id) ON DELETE SET NULL,

    set_title        TEXT        NOT NULL,
    pairs_total      INT         NOT NULL DEFAULT 0,
    pairs_matched    INT         NOT NULL DEFAULT 0,
    mistakes         INT         NOT NULL DEFAULT 0,
    completed        BOOLEAN     NOT NULL DEFAULT FALSE,
    duration_seconds INT,

    played_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE matching_results IS
    'Matching game session log. user_id -> auth.users.';

-- 13. mock_exam_attempts
CREATE TABLE IF NOT EXISTS mock_exam_attempts (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    config_id           UUID        NOT NULL REFERENCES mock_exam_configs(id) ON DELETE CASCADE,

    score               INT         NOT NULL DEFAULT 0,
    total_questions     INT         NOT NULL DEFAULT 0,
    correct_count       INT         NOT NULL DEFAULT 0,
    incorrect_count     INT         NOT NULL DEFAULT 0,
    skipped_count       INT         NOT NULL DEFAULT 0,
    duration_seconds    INT,
    time_limit_seconds  INT,
    status              TEXT        NOT NULL
                            CHECK (status IN ('in_progress', 'completed', 'timed_out'))
                            DEFAULT 'in_progress',

    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

COMMENT ON TABLE mock_exam_attempts IS
    'Mock exam attempt header. user_id -> auth.users. config_id -> mock_exam_configs.';

-- 14. mock_exam_answer_logs
CREATE TABLE IF NOT EXISTS mock_exam_answer_logs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID        NOT NULL REFERENCES mock_exam_attempts(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES mock_exam_questions(id) ON DELETE CASCADE,

    selected_index  SMALLINT,
    correct_index   SMALLINT    NOT NULL,
    is_correct      BOOLEAN,
    time_taken_ms   INT,

    answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mock_exam_answer_logs IS
    'Per-question answer inside a mock exam attempt. user_id -> auth.users.';


-- ===========================================================================
-- INDEXES
-- ===========================================================================

-- Content
CREATE INDEX IF NOT EXISTS idx_flashcards_deck            ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_category   ON flashcard_decks(category_id);
CREATE INDEX IF NOT EXISTS idx_mcq_category               ON multiple_choice_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_tf_category                ON true_false_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_matching_pairs_category    ON matching_pairs(category_id);
CREATE INDEX IF NOT EXISTS idx_mock_qs_config             ON mock_exam_questions(config_id);

-- Results
CREATE INDEX IF NOT EXISTS idx_fc_sessions_user           ON flashcard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fc_sessions_deck           ON flashcard_sessions(deck_id);
CREATE INDEX IF NOT EXISTS idx_mcq_results_user           ON multiple_choice_results(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_results_question       ON multiple_choice_results(question_id);
CREATE INDEX IF NOT EXISTS idx_tf_results_user            ON true_false_results(user_id);
CREATE INDEX IF NOT EXISTS idx_tf_results_question        ON true_false_results(question_id);
CREATE INDEX IF NOT EXISTS idx_matching_results_user      ON matching_results(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_user         ON mock_exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_config       ON mock_exam_attempts(config_id);
CREATE INDEX IF NOT EXISTS idx_mock_answer_logs_attempt   ON mock_exam_answer_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_mock_answer_logs_user      ON mock_exam_answer_logs(user_id);


-- ===========================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================================================

ALTER TABLE practice_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiple_choice_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE true_false_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_pairs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_configs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiple_choice_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE true_false_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_attempts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_answer_logs      ENABLE ROW LEVEL SECURITY;

-- Content: any authenticated user can read published rows
CREATE POLICY "Read published practice_categories"
    ON practice_categories FOR SELECT USING (TRUE);

CREATE POLICY "Read published flashcard_decks"
    ON flashcard_decks FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Read flashcards of published decks"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_decks d
            WHERE d.id = flashcards.deck_id AND d.is_published = TRUE
        )
    );

CREATE POLICY "Read published multiple_choice_questions"
    ON multiple_choice_questions FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Read published true_false_questions"
    ON true_false_questions FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Read published matching_pairs"
    ON matching_pairs FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Read published mock_exam_configs"
    ON mock_exam_configs FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Read published mock_exam_questions"
    ON mock_exam_questions FOR SELECT USING (is_published = TRUE);

-- Results: each user owns only their own rows
CREATE POLICY "Own flashcard_sessions"
    ON flashcard_sessions FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own multiple_choice_results"
    ON multiple_choice_results FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own true_false_results"
    ON true_false_results FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own matching_results"
    ON matching_results FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own mock_exam_attempts"
    ON mock_exam_attempts FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own mock_exam_answer_logs"
    ON mock_exam_answer_logs FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ===========================================================================
-- SEED DATA
-- Looks for any user with role = 'admin' in public.users.
-- If none exists yet, the block is skipped safely.
-- ===========================================================================

DO $$
DECLARE
    admin_id BIGINT;
BEGIN
    -- Fetch the first admin from public.users
    SELECT id INTO admin_id
    FROM public.users
    WHERE role = 'admin'
    LIMIT 1;

    IF admin_id IS NULL THEN
        RAISE NOTICE 'No admin user found in public.users (role=admin). Seed skipped.';
        RAISE NOTICE 'To seed later: UPDATE public.users SET role = ''admin'' WHERE email = ''your-email''; then re-run this seed block.';
        RETURN;
    END IF;

    INSERT INTO mock_exam_configs (
        admin_id, level_key, title, subtitle, tag,
        total_questions, time_limit_seconds, is_published, sections
    )
    VALUES
    (
        admin_id,
        'professional',
        'Professional Level',
        'CSE-PPT Professional',
        '1 DA',
        170,
        11400,
        TRUE,
        '[
            {"name": "Verbal Ability",      "description": "Vocabulary, grammar, correct spelling, paragraph organization, and reading comprehension."},
            {"name": "Analytical Ability",  "description": "Word analogy, logical reasoning, data interpretation, and sequencing."},
            {"name": "Numerical Ability",   "description": "Basic math, numerical reasoning, and simple algebra word problems."},
            {"name": "General Information", "description": "Philippine Constitution, RA 6713 (Code of Conduct), environment management, and peace/human rights concepts."}
        ]'::JSONB
    ),
    (
        admin_id,
        'sub_professional',
        'Sub-Professional Level',
        'CSE-PPT Sub-Professional',
        '1 DA',
        165,
        9600,
        TRUE,
        '[
            {"name": "Verbal Ability",      "description": "Vocabulary, grammar, correct spelling, and reading comprehension."},
            {"name": "Clerical Ability",    "description": "Filing, alphabetizing, coding, and basic clerical operations."},
            {"name": "Numerical Ability",   "description": "Basic math and numerical reasoning at a foundational level."},
            {"name": "General Information", "description": "Philippine Constitution, RA 6713 (Code of Conduct), environment management, and peace/human rights concepts."}
        ]'::JSONB
    )
    ON CONFLICT (level_key) DO NOTHING;

    RAISE NOTICE 'Seed complete. admin_id (public.users) used: %', admin_id;
END $$;


-- ===========================================================================
-- VIEWS
-- ===========================================================================

CREATE OR REPLACE VIEW v_mock_exam_summary AS
SELECT
    a.user_id,
    c.level_key,
    c.title                                                     AS exam_title,
    COUNT(a.id)                                                 AS total_attempts,
    MAX(a.score)                                                AS best_score,
    ROUND(AVG(a.score), 2)                                      AS avg_score,
    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END)    AS completed_attempts,
    MAX(a.completed_at)                                         AS last_attempt_at
FROM mock_exam_attempts a
JOIN mock_exam_configs   c ON c.id = a.config_id
GROUP BY a.user_id, c.id, c.level_key, c.title;

CREATE OR REPLACE VIEW v_mcq_accuracy AS
SELECT
    r.user_id,
    q.category_id,
    COUNT(r.id)                                                              AS total_answered,
    SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)                           AS correct_count,
    ROUND(
        100.0 * SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)
        / NULLIF(COUNT(r.id), 0), 2
    )                                                                        AS accuracy_pct
FROM multiple_choice_results r
JOIN multiple_choice_questions q ON q.id = r.question_id
GROUP BY r.user_id, q.category_id;

CREATE OR REPLACE VIEW v_tf_accuracy AS
SELECT
    r.user_id,
    q.category_id,
    COUNT(r.id)                                                              AS total_answered,
    SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)                           AS correct_count,
    ROUND(
        100.0 * SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)
        / NULLIF(COUNT(r.id), 0), 2
    )                                                                        AS accuracy_pct
FROM true_false_results r
JOIN true_false_questions q ON q.id = r.question_id
GROUP BY r.user_id, q.category_id;


-- ===========================================================================
-- END OF SCRIPT
-- ===========================================================================
