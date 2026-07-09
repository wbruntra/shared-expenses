import { render } from 'preact'
import { Router } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import './index.css'
import { App } from './app.jsx'

render(
  <Router hook={useHashLocation}>
    <App />
  </Router>,
  document.getElementById('app')
)
