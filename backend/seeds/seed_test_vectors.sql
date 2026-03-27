-- Seed data: Lee's 3 test vectors + 2 boundary-value rows
-- Run after migration: psql $DATABASE_URL -f seeds/seed_test_vectors.sql

-- Test Vector 1: Stage 3b (BUN 35, eGFR 33, Age 58)
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES ('00000000-0000-0000-0000-000000000001', 'vector1@test.kidneyhood.org', 'Test Vector 1', 58, 35, 2.1, 33.0);

-- Test Vector 2: Stage 5 (BUN 53, eGFR 10, Age 65)
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES ('00000000-0000-0000-0000-000000000002', 'vector2@test.kidneyhood.org', 'Test Vector 2', 65, 53, 5.0, 10.0);

-- Test Vector 3: Stage 3a (BUN 22, eGFR 48, Age 52)
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES ('00000000-0000-0000-0000-000000000003', 'vector3@test.kidneyhood.org', 'Test Vector 3', 52, 22, 1.5, 48.0);

-- Boundary: minimum valid values
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES ('00000000-0000-0000-0000-000000000004', 'boundary-min@test.kidneyhood.org', 'Boundary Min', 18, 5, 0.3, NULL);

-- Boundary: maximum valid values
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES ('00000000-0000-0000-0000-000000000005', 'boundary-max@test.kidneyhood.org', 'Boundary Max', 120, 150, 15.0, NULL);
