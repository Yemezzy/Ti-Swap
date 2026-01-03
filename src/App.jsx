import { useState } from 'react'
import './App.css'
import Startpage from './Pages/Startpage'
import Ethpage from './Pages/Ethpage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
{/* <Startpage/> */}
<Ethpage/>
    </>
  )
}

export default App
