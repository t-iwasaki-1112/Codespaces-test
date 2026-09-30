-- ベースとなるテーブル（V1.0）の作成
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL
);

-- 初期のマスターデータ（V1.0）の投入
INSERT INTO tasks (title) VALUES 
('既存システムの移行'), 
('Codespaces環境の構築');
