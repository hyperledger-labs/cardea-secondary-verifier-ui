import { createStore, combineReducers } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'

// Import reducers
import loginReducer from './redux/loginReducer'

const rootReducer = combineReducers({
    login: loginReducer,
    // add more reducers
})

export default createStore(
    rootReducer,
    // Comment out the following line when pushing to production
    composeWithDevTools()
)