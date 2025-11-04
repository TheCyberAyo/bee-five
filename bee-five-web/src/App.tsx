"use client";

import React from 'react';
import './App.css';
import SimpleWelcome from './components/SimpleWelcome';
import { SupabaseStatus } from './components/SupabaseStatus';

function App() {
  return (
    <div className="app">
      <SimpleWelcome />
      <SupabaseStatus />
    </div>
  );
}

export default App;