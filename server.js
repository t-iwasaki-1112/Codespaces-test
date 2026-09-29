const express = require('express');
const { Client } = require('pg');
const app = express();

// データの受け取り設定
app.use(express.json());

const dbConfig = {
  user: 'myuser',
  password: 'mypassword',
  host: 'localhost',
  database: 'mydb',
  port: 5432,
};

// 【初期化】DBテーブル作成と初期データ
async function setupDB() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL
      )
    `);
    // データが空なら初期データを投入
    const res = await client.query("SELECT count(*) FROM tasks");
    if (parseInt(res.rows[0].count) === 0) {
      await client.query("INSERT INTO tasks (title) VALUES ('Gitpodの環境構築'), ('CRUDデモの実行')");
    }
    console.log("DBのセットアップが完了しました。");
  } catch (err) {
    console.error("DBエラー:", err);
  } finally {
    await client.end();
  }
}
setupDB();

// ==========================================
// APIエンドポイント (CRUDの処理)
// ==========================================

// 【R】Read: 一覧取得
app.get('/api/tasks', async (req, res) => {
  const client = new Client(dbConfig);
  await client.connect();
  const result = await client.query("SELECT * FROM tasks ORDER BY id ASC");
  await client.end();
  res.json(result.rows);
});

// 【C】Create: 新規作成
app.post('/api/tasks', async (req, res) => {
  const client = new Client(dbConfig);
  await client.connect();
  const result = await client.query("INSERT INTO tasks (title) VALUES ($1) RETURNING *", [req.body.title]);
  await client.end();
  res.json(result.rows[0]);
});

// 【U】Update: 更新
app.put('/api/tasks/:id', async (req, res) => {
  const client = new Client(dbConfig);
  await client.connect();
  const result = await client.query("UPDATE tasks SET title = $1 WHERE id = $2 RETURNING *", [req.body.title, req.params.id]);
  await client.end();
  res.json(result.rows[0]);
});

// 【D】Delete: 削除
app.delete('/api/tasks/:id', async (req, res) => {
  const client = new Client(dbConfig);
  await client.connect();
  await client.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
  await client.end();
  res.json({ success: true });
});

// ==========================================
// フロントエンド画面 (HTML/CSS/JS)
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>タスク管理 (CRUDデモ)</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f7f6; padding: 20px; }
        .container { max-width: 600px; margin: auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-top: 0; font-size: 24px; }
        .flex { display: flex; gap: 10px; margin-bottom: 20px; }
        input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        button { padding: 12px 20px; border: none; background: #0052cc; color: white; border-radius: 4px; cursor: pointer; font-size: 14px; transition: 0.2s; }
        button:hover { background: #003d99; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; justify-content: space-between; align-items: center; padding: 15px 10px; border-bottom: 1px solid #eee; }
        li:last-child { border-bottom: none; }
        .task-title { font-size: 16px; color: #333; }
        .actions button { padding: 8px 12px; margin-left: 5px; border-radius: 4px; font-size: 12px; }
        .actions button.edit { background: #f4f5f7; color: #42526e; border: 1px solid #dfe1e6; }
        .actions button.edit:hover { background: #ebecf0; }
        .actions button.delete { background: #ffebe6; color: #bf2600; border: 1px solid #ffbdad; }
        .actions button.delete:hover { background: #ffbdad; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ タスク管理 (PostgreSQL連携デモ)</h1>
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
          画面の操作はすべて裏側のPostgreSQL（API）にリアルタイムで反映されます。
        </p>
        
        <div class="flex">
          <input type="text" id="taskTitle" placeholder="新しいタスクを入力...">
          <button onclick="addTask()">追加</button>
        </div>
        
        <ul id="taskList"></ul>
      </div>

      <script>
        // 一覧を表示する (Read)
        async function fetchTasks() {
          const res = await fetch('/api/tasks');
          const tasks = await res.json();
          const list = document.getElementById('taskList');
          list.innerHTML = '';
          
          tasks.forEach(task => {
            list.innerHTML += \`
              <li>
                <span class="task-title" id="title-\${task.id}">\${task.title}</span>
                <div class="actions">
                  <button class="edit" onclick="editTask(\${task.id})">編集</button>
                  <button class="delete" onclick="deleteTask(\${task.id})">削除</button>
                </div>
              </li>
            \`;
          });
        }

        // タスクを追加する (Create)
        async function addTask() {
          const input = document.getElementById('taskTitle');
          if (!input.value) return;
          
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: input.value })
          });
          
          input.value = '';
          fetchTasks(); // 画面を更新
        }

        // タスクを編集する (Update)
        async function editTask(id) {
          const span = document.getElementById(\`title-\${id}\`);
          const newTitle = prompt('タスク名を編集:', span.innerText);
          
          if (newTitle && newTitle !== span.innerText) {
            await fetch(\`/api/tasks/\${id}\`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newTitle })
            });
            fetchTasks(); // 画面を更新
          }
        }

        // タスクを削除する (Delete)
        async function deleteTask(id) {
          if (confirm('本当に削除してよろしいですか？')) {
            await fetch(\`/api/tasks/\${id}\`, { method: 'DELETE' });
            fetchTasks(); // 画面を更新
          }
        }

        // 画面読み込み時に一覧を取得
        fetchTasks();
      </script>
    </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Webサーバーが起動しました（ポート3000）');
});
