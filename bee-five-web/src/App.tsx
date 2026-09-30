"use client";

import React from 'react';
import './App.css';
import SimpleWelcome from './components/SimpleWelcome';
import FirstPlayGate from './components/onboarding/FirstPlayGate';
import { SupabaseStatus } from './components/SupabaseStatus';

function App() {
  return (
    <div className="app">
      <FirstPlayGate><SimpleWelcome /></FirstPlayGate>
      <SupabaseStatus />
    </div>
  );
}

export default App;