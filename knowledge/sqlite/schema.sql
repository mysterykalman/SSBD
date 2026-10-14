-- Pam canonical static knowledge database, v1.
-- SQLite 3; all facts are persisted, never inferred from missing rows.
PRAGMA foreign_keys = ON;
CREATE TABLE schema_versions(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE subjects(subject_id TEXT PRIMARY KEY, display_name TEXT NOT NULL);
CREATE TABLE concepts(concept_id TEXT PRIMARY KEY, canonical_name TEXT NOT NULL, primary_subject_id TEXT REFERENCES subjects(subject_id), identity_kind TEXT NOT NULL DEFAULT 'generic' CHECK(identity_kind IN ('generic','entity')), external_id TEXT, review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')));
CREATE UNIQUE INDEX concepts_external_identity ON concepts(identity_kind,external_id) WHERE external_id IS NOT NULL;
CREATE TABLE concept_subjects(concept_id TEXT NOT NULL REFERENCES concepts(concept_id), subject_id TEXT NOT NULL REFERENCES subjects(subject_id), PRIMARY KEY(concept_id,subject_id));
CREATE TABLE aliases(alias_id INTEGER PRIMARY KEY, concept_id TEXT NOT NULL REFERENCES concepts(concept_id), alias TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en', is_ambiguous INTEGER NOT NULL DEFAULT 0 CHECK(is_ambiguous IN (0,1)), UNIQUE(concept_id,alias,locale));
CREATE INDEX aliases_lookup ON aliases(alias,locale);
CREATE TABLE questions(question_id TEXT PRIMARY KEY, wording TEXT NOT NULL, subject_id TEXT REFERENCES subjects(subject_id), requires_json TEXT, status TEXT NOT NULL DEFAULT 'approved');
CREATE TABLE predicates(predicate_id TEXT PRIMARY KEY, label TEXT NOT NULL, inverse_id TEXT REFERENCES predicates(predicate_id));
CREATE TABLE sources(source_id TEXT PRIMARY KEY, source_name TEXT NOT NULL, source_version TEXT, source_uri TEXT, imported_at TEXT);
CREATE TABLE evidence(evidence_id TEXT PRIMARY KEY, source_id TEXT REFERENCES sources(source_id), source_record_id TEXT, subject_concept_id TEXT NOT NULL REFERENCES concepts(concept_id), predicate_id TEXT REFERENCES predicates(predicate_id), object_concept_id TEXT REFERENCES concepts(concept_id), literal_value TEXT, raw_payload TEXT, confidence REAL CHECK(confidence BETWEEN 0 AND 1), UNIQUE(source_id,source_record_id));
CREATE TABLE facts(fact_id TEXT PRIMARY KEY, concept_id TEXT NOT NULL REFERENCES concepts(concept_id), question_id TEXT NOT NULL REFERENCES questions(question_id), answer TEXT NOT NULL CHECK(answer IN ('yes','no','unknown','qualified')), qualification TEXT, confidence REAL CHECK(confidence BETWEEN 0 AND 1), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), CHECK(answer != 'qualified' OR qualification IS NOT NULL), UNIQUE(concept_id,question_id));
CREATE TABLE fact_evidence(fact_id TEXT NOT NULL REFERENCES facts(fact_id), evidence_id TEXT NOT NULL REFERENCES evidence(evidence_id), PRIMARY KEY(fact_id,evidence_id));
CREATE TABLE relationships(relationship_id TEXT PRIMARY KEY, subject_concept_id TEXT NOT NULL REFERENCES concepts(concept_id), predicate_id TEXT NOT NULL REFERENCES predicates(predicate_id), object_concept_id TEXT NOT NULL REFERENCES concepts(concept_id), status TEXT NOT NULL DEFAULT 'pending', UNIQUE(subject_concept_id,predicate_id,object_concept_id));
CREATE TABLE releases(release_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, content_sha256 TEXT NOT NULL, baseline_release_id TEXT REFERENCES releases(release_id), approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)), audit_json TEXT NOT NULL);
CREATE TABLE release_facts(release_id TEXT NOT NULL REFERENCES releases(release_id), fact_id TEXT NOT NULL REFERENCES facts(fact_id), PRIMARY KEY(release_id,fact_id));
-- Subject-specific entity tables: shared concept identity, specialized fields.
CREATE TABLE animals(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), scientific_name TEXT, animal_group TEXT);
CREATE TABLE animal_habitats(concept_id TEXT NOT NULL REFERENCES animals(concept_id), habitat_concept_id TEXT NOT NULL REFERENCES concepts(concept_id), PRIMARY KEY(concept_id,habitat_concept_id));
CREATE TABLE animal_diets(concept_id TEXT NOT NULL REFERENCES animals(concept_id), food_concept_id TEXT NOT NULL REFERENCES concepts(concept_id), PRIMARY KEY(concept_id,food_concept_id));
CREATE TABLE plants(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), scientific_name TEXT, plant_group TEXT);
CREATE TABLE foods(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), food_group TEXT);
CREATE TABLE food_ingredients(food_concept_id TEXT NOT NULL REFERENCES foods(concept_id), ingredient_concept_id TEXT NOT NULL REFERENCES concepts(concept_id), PRIMARY KEY(food_concept_id,ingredient_concept_id));
CREATE TABLE places(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), place_type TEXT, parent_place_id TEXT REFERENCES places(concept_id));
CREATE TABLE people(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), occupation TEXT);
CREATE TABLE objects(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), object_type TEXT);
CREATE TABLE vehicles(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), vehicle_type TEXT);
CREATE TABLE media(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), medium TEXT, release_year INTEGER);
CREATE TABLE science(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), discipline TEXT);
CREATE TABLE sports(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), sport_type TEXT);
CREATE TABLE technology(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), technology_type TEXT);
CREATE TABLE abstract_concepts(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), abstract_type TEXT);
CREATE TABLE nature(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), nature_type TEXT);
CREATE TABLE activities(concept_id TEXT PRIMARY KEY REFERENCES concepts(concept_id), activity_type TEXT);
CREATE INDEX facts_by_question ON facts(question_id,answer,status);
CREATE INDEX evidence_by_subject ON evidence(subject_concept_id);
CREATE INDEX relationships_by_object ON relationships(object_concept_id,predicate_id);
INSERT INTO schema_versions(version,applied_at) VALUES(1,'2026-10-14');
INSERT INTO subjects(subject_id,display_name) VALUES
('animals','Animals'),('plants','Plants'),('food','Food & Drink'),('places','Places'),('people','People'),('objects','Objects'),('vehicles','Vehicles'),('media','Media & Culture'),('science','Science'),('sports','Sports'),('technology','Technology'),('abstract','Abstract Concepts'),('nature','Nature'),('activities','Activities');
