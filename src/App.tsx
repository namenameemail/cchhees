import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import {Game} from "./game";

function App() {
  const [count, setCount] = useState(0)

  return (
    <Game/>
  )
}

export default App
