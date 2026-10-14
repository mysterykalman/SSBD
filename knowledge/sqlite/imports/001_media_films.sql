-- First real subject import: Media / films.
-- Transcribed from src/client/mom-mode/knowledge.general.js at the branch snapshot.
-- Positive features only; no missing feature is treated as 'no'.
BEGIN TRANSACTION;
INSERT INTO sources(source_id,source_name,source_version,source_uri,imported_at)
VALUES('mom-general-v1','Curated general knowledge','1','src/client/mom-mode/knowledge.general.js','2026-10-14');
INSERT INTO questions(question_id,wording,subject_id,requires_json) VALUES
('manmade','Is it man-made?','media',NULL),
('gk_film','Is it a movie?','media','"manmade"'),
('gk_scifi','Is science fiction central to it?','media','"manmade"'),
('gk_animated','Is it animated?','media','"gk_film"'),
('gk_fantasy','Is fantasy central to it?','media','"manmade"');
INSERT INTO concepts(concept_id,canonical_name,primary_subject_id,identity_kind,review_status) VALUES
('gk:film:star-wars','Star Wars','media','entity','pending'),
('gk:film:the-godfather','The Godfather','media','entity','pending'),
('gk:film:jaws','Jaws','media','entity','pending'),
('gk:film:et','E.T. the Extra-Terrestrial','media','entity','pending'),
('gk:film:jurassic-park','Jurassic Park','media','entity','pending'),
('gk:film:the-matrix','The Matrix','media','entity','pending'),
('gk:film:titanic','Titanic','media','entity','pending'),
('gk:film:toy-story','Toy Story','media','entity','pending'),
('gk:film:the-lion-king','The Lion King','media','entity','pending'),
('gk:film:frozen','Frozen','media','entity','pending');
INSERT INTO concept_subjects(concept_id,subject_id) SELECT concept_id,'media' FROM concepts WHERE concept_id LIKE 'gk:film:%';
INSERT INTO media(concept_id,medium) SELECT concept_id,'film' FROM concepts WHERE concept_id LIKE 'gk:film:%';
INSERT INTO facts(fact_id,concept_id,question_id,answer,confidence,status)
SELECT 'fact:'||concept_id||':'||question_id,concept_id,question_id,'yes',1.0,'pending'
FROM concepts CROSS JOIN (SELECT 'manmade' question_id UNION ALL SELECT 'gk_film') q WHERE concept_id LIKE 'gk:film:%';
INSERT INTO facts(fact_id,concept_id,question_id,answer,confidence,status) VALUES
('fact:gk:film:star-wars:gk_scifi','gk:film:star-wars','gk_scifi','yes',1,'pending'),
('fact:gk:film:et:gk_scifi','gk:film:et','gk_scifi','yes',1,'pending'),
('fact:gk:film:jurassic-park:gk_scifi','gk:film:jurassic-park','gk_scifi','yes',1,'pending'),
('fact:gk:film:the-matrix:gk_scifi','gk:film:the-matrix','gk_scifi','yes',1,'pending'),
('fact:gk:film:toy-story:gk_animated','gk:film:toy-story','gk_animated','yes',1,'pending'),
('fact:gk:film:the-lion-king:gk_animated','gk:film:the-lion-king','gk_animated','yes',1,'pending'),
('fact:gk:film:frozen:gk_animated','gk:film:frozen','gk_animated','yes',1,'pending'),
('fact:gk:film:frozen:gk_fantasy','gk:film:frozen','gk_fantasy','yes',1,'pending');
-- Evidence row per explicit source assertion; linked to corresponding fact.
INSERT INTO evidence(evidence_id,source_id,source_record_id,subject_concept_id,literal_value,confidence)
SELECT 'evidence:'||fact_id,'mom-general-v1',fact_id,concept_id,question_id||'=yes',1.0 FROM facts WHERE concept_id LIKE 'gk:film:%';
INSERT INTO fact_evidence(fact_id,evidence_id)
SELECT fact_id,'evidence:'||fact_id FROM facts WHERE concept_id LIKE 'gk:film:%';
COMMIT;
