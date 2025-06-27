// pages/rules.js

import { useState } from 'react';
import axios from 'axios';

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState('');

  const addRule = () => {
    try {
      const ruleObj = JSON.parse(newRule);
      setRules([...rules, ruleObj]);
      setNewRule('');
    } catch {
      alert("Invalid JSON format.");
    }
  };

  const exportRules = async () => {
    try {
      await axios.post("https://ai-data-alchemist-backend.onrender.com", { rules }, {
        auth: {
          username: "admin",
          password: "password123",
        }
      });
      alert("Rules saved as rules.json!");
    } catch  {
      alert("Failed to export rules.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Define Rules</h1>
      <textarea
        value={newRule}
        onChange={(e) => setNewRule(e.target.value)}
        placeholder='e.g. {"type": "coRun", "tasks": ["T1", "T2"]}'
        rows={4}
        cols={60}
        style={{ display: 'block', marginBottom: 10 }}
      />
      <button onClick={addRule}>Add Rule</button>

      <h3 style={{ marginTop: 20 }}>Current Rules:</h3>
      <pre>{JSON.stringify(rules, null, 2)}</pre>

      <button onClick={exportRules} style={{ marginTop: 10 }}>Generate Rules Config</button>
    </div>
  );
}
