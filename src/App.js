import Axios from 'axios'

import Cookies from 'universal-cookie'
import React, { useState, useEffect, useRef, useMemo } from 'react'

import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom'
import styled, { ThemeProvider } from 'styled-components'

import AccountSetup from './UI/AccountSetup'

import { check } from './UI/CanUser'
import rules from './UI/rbac-rules'
import AdminRoute from './routes/AdminRoute'
import ForgotPassword from './UI/ForgotPassword'
import FullPageSpinner from './UI/FullPageSpinner'
import Login from './UI/Login'
import Root from './UI/Root'

import {
  useNotification,
  NotificationProvider,
} from './UI/NotificationProvider'
import PasswordReset from './UI/PasswordReset'
import SessionProvider from './UI/SessionProvider'

import './App.css'

const Frame = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
`
const Main = styled.main`
  flex: 9;
  padding: 30px;
`

function App() {
  const defaultTheme = {
    primary_color: '#386992',
    secondary_color: '#4E556F',
    neutral_color: '#091C40',
    negative_color: '#ed003c',
    warning_color: '#e49b13',
    positive_color: '#008a00',
    text_color: '#555',
    text_light: '#fff',
    border: '#e3e3e3',
    drop_shadow: '3px 3px 3px rgba(0, 0, 0, 0.3)',
    background_primary: '#fff',
    background_secondary: '#f5f5f5',
  }

  const cookies = new Cookies()

  // (AmmonBurgi) Keeps track of loading processes. The useMemo is necessary to preserve list across re-renders.
  const adminLoadingList = useMemo(() => [], [])
  const anonLoadingList = useMemo(() => [], [])

  const setNotification = useNotification()

  // Websocket reference hook
  const controllerAdminSocket = useRef()
  const controllerAnonSocket = useRef()

  // Used for websocket auto reconnect
  const [adminWebsocket, setAdminWebsocket] = useState(false)
  const [anonWebsocket, setAnonWebsocket] = useState(false)
  const [readyForAdminMessages, setReadyForAdminMessages] = useState(false)
  const [readyForAnonMessages, setReadyForAnonMessages] = useState(false)

  // State governs whether the app should be loaded. Depends on the loadingArray
  const [appIsLoaded, setAppIsLoaded] = useState(false)

  // Check for local state copy of theme, otherwise use default hard coded here in App.js
  const localTheme = JSON.parse(localStorage.getItem('recentTheme'))
  const [theme, setTheme] = useState(localTheme ? localTheme : defaultTheme)
  const [schemas, setSchemas] = useState({})

  // Styles to change array
  const [stylesArray, setStylesArray] = useState([])

  // Message states
  const [contacts, setContacts] = useState([])
  const [credentials, setCredentials] = useState([])
  const [presentationReports, setPresentationReports] = useState([])
  const [image, setImage] = useState()
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [user, setUser] = useState({})
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [organizationName, setOrganizationName] = useState(null)
  const [smtp, setSmtp] = useState(null)

  const [siteTitle, setSiteTitle] = useState('')

  const [privileges, setPrivileges] = useState([])

  // session states
  const [session, setSession] = useState('')
  const [loggedInUserId, setLoggedInUserId] = useState('')
  const [loggedInUserState, setLoggedInUserState] = useState(null)
  const [loggedInUsername, setLoggedInUsername] = useState('')
  const [loggedInRoles, setLoggedInRoles] = useState([])
  const [loggedIn, setLoggedIn] = useState(false)
  const [sessionTimer, setSessionTimer] = useState(60)

  const [QRCodeURL, setQRCodeURL] = useState('')
  const [verificationStatus, setVerificationStatus] = useState()
  const [verifiedCredential, setVerifiedCredential] = useState('')
  const [pendingConnectionID, setPendingConnectionID] = useState('')

  // (JamesKEbert) Note: We may want to abstract the websockets out into a high-order component for better abstraction, especially potentially with authentication/authorization

  // Perform First Time Setup. Connect to Controller Server via Websockets

  useEffect(() => {
    if (!anonWebsocket) {
      let url = new URL('/api/anon/ws', window.location.href)
      url.protocol = url.protocol.replace('http', 'ws')
      controllerAnonSocket.current = new WebSocket(url.href)
      controllerAnonSocket.current.onopen = (event) => {
        setAnonWebsocket(true)
      }

      controllerAnonSocket.current.onclose = (event) => {
        // Auto Reopen websocket connection
        // (JamesKEbert) TODO: Converse on sessions, session timeout and associated UI

        setReadyForAnonMessages(false)
        setAnonWebsocket(false)
      }

      // Error Handler
      controllerAnonSocket.current.onerror = (event) => {
        setNotification('Client Error - Websockets', 'error')
      }

      // Receive new message from Controller Server
      controllerAnonSocket.current.onmessage = (message) => {
        const parsedMessage = JSON.parse(message.data)

        messageHandler(
          parsedMessage.context,
          parsedMessage.type,
          parsedMessage.data
        )
      }
    }
  }, [readyForAnonMessages])

  // TODO: Setting logged-in user and session states on app mount
  useEffect(() => {
    Axios({
      method: 'GET',
      url: '/api/renew-session',
    })
      .then((res) => {
        if (cookies.get('sessionId')) {
          // Update session expiration date
          setSession(cookies.get('sessionId'))
          setLoggedIn(true)

          setLoggedInUserState(res.data)
          setLoggedInUserId(res.data.id)
          setLoggedInUsername(res.data.username)
          setLoggedInRoles(res.data.roles)
        } else setAppIsLoaded(true)
      })
      .catch((error) => {
        // Unauthorized
        setAppIsLoaded(true)
      })
  }, [loggedIn])

  // Setting up websocket and controllerSocket
  useEffect(() => {
    if (session && loggedIn) {
      let url = new URL('/api/admin/ws', window.location.href)
      url.protocol = url.protocol.replace('http', 'ws')
      controllerAdminSocket.current = new WebSocket(url.href)

      controllerAdminSocket.current.onopen = () => {
        setAdminWebsocket(true)
      }

      controllerAdminSocket.current.onclose = (event) => {
        // Auto Reopen websocket connection
        // (JamesKEbert) TODO: Converse on sessions, session timeout and associated UI

        setReadyForAdminMessages(false)
        setLoggedIn(false)
        setAdminWebsocket(false)
      }

      // Error Handler
      controllerAdminSocket.current.onerror = (event) => {
        setNotification('Client Error - Websockets', 'error')
      }

      // Receive new message from Controller Server
      controllerAdminSocket.current.onmessage = (message) => {
        const parsedMessage = JSON.parse(message.data)

        messageHandler(
          parsedMessage.context,
          parsedMessage.type,
          parsedMessage.data
        )
      }
    } else {
      controllerAnonSocket.current.onopen = () => {
        // Resetting state to false to allow spinner while waiting for messages
        // Comment the following line back in when we fix the timing bug
        //setAppIsLoaded(false) // This doesn't work as expected. See function removeLoadingProcess

        console.log('Ready to send messages')

        // sendAnonMessage('SETTINGS', 'GET_THEME', {})
        // addLoadingProcess('THEME')
        sendAnonMessage('SETTINGS', 'GET_SCHEMAS', {})
        addLoadingProcess('SCHEMAS')

        sendAnonMessage('SETTINGS', 'GET_ORGANIZATION', {})
        addLoadingProcess('ORGANIZATION')

        sendAnonMessage('IMAGES', 'GET_ALL', {})
        addLoadingProcess('LOGO')
      }

      controllerAnonSocket.current.onclose = (event) => {
        // Auto Reopen websocket connection
        // (JamesKEbert) TODO: Converse on sessions, session timeout and associated UI

        setReadyForAnonMessages(false)
        setAnonWebsocket(false)
      }

      // Error Handler
      controllerAnonSocket.current.onerror = (event) => {
        setNotification('Client Error - Websockets', 'error')
      }

      // Receive new message from Controller Server
      controllerAnonSocket.current.onmessage = (message) => {
        const parsedMessage = JSON.parse(message.data)

        messageHandler(
          parsedMessage.context,
          parsedMessage.type,
          parsedMessage.data
        )
      }
    }
  }, [loggedIn, session])

  // (eldersonar) Set-up site title. What about SEO? Will robots be able to read it?
  useEffect(() => {
    document.title = siteTitle
  }, [siteTitle])

  useEffect(() => {
    // Perform operation on websocket open
    // Run web sockets only if authenticated
    if (
      session &&
      loggedIn &&
      adminWebsocket &&
      readyForAdminMessages &&
      loggedInUserState &&
      adminLoadingList.length === 0
    ) {
      sendAdminMessage('SETTINGS', 'GET_THEME', {})
      addLoadingProcess('THEME')
      sendAdminMessage('SETTINGS', 'GET_SCHEMAS', {})
      addLoadingProcess('SCHEMAS')
      sendAdminMessage('GOVERNANCE', 'GET_PRIVILEGES', {})
      addLoadingProcess('GOVERNANCE')

      if (
        check(rules, loggedInUserState, 'contacts:read', 'demographics:read')
      ) {
        sendAdminMessage('CONTACTS', 'GET_ALL', {
          additional_tables: ['Demographic', 'Passport'],
        })
        addLoadingProcess('CONTACTS')
      }

      if (check(rules, loggedInUserState, 'credentials:read')) {
        sendAdminMessage('CREDENTIALS', 'GET_ALL', {})
        addLoadingProcess('CREDENTIALS')
      }

      if (check(rules, loggedInUserState, 'presentations:read')) {
        sendAdminMessage('PRESENTATIONS', 'GET_ALL', {})
        addLoadingProcess('PRESENTATIONS')
      }

      if (check(rules, loggedInUserState, 'roles:read')) {
        sendAdminMessage('ROLES', 'GET_ALL', {})
        addLoadingProcess('ROLES')
      }

      sendAdminMessage('SETTINGS', 'GET_ORGANIZATION', {})
      addLoadingProcess('ORGANIZATION')

      if (check(rules, loggedInUserState, 'settings:update')) {
        sendAdminMessage('SETTINGS', 'GET_SMTP', {})
        addLoadingProcess('SMTP')
      }

      sendAdminMessage('IMAGES', 'GET_ALL', {})
      addLoadingProcess('LOGO')

      // This is the example of atuthorizing websockets
      if (check(rules, loggedInUserState, 'users:read')) {
        sendAdminMessage('USERS', 'GET_ALL', {})
        addLoadingProcess('USERS')
      }
    } else if (
      !session &&
      !loggedIn &&
      anonWebsocket &&
      readyForAnonMessages &&
      anonLoadingList.length === 0
    ) {
      sendAnonMessage('SETTINGS', 'GET_THEME', {})
      addLoadingProcess('THEME')
      sendAnonMessage('SETTINGS', 'GET_SCHEMAS', {})
      addLoadingProcess('SCHEMAS')

      sendAnonMessage('SETTINGS', 'GET_ORGANIZATION', {})
      addLoadingProcess('ORGANIZATION')

      sendAnonMessage('IMAGES', 'GET_ALL', {})
      addLoadingProcess('LOGO')
    }
  }, [
    session,
    loggedIn,
    adminWebsocket,
    readyForAdminMessages,
    loggedInUserState,
    anonWebsocket,
    readyForAnonMessages,
  ])

  // (eldersonar) Shut down the websocket
  function closeWSConnection(code, reason) {
    controllerAdminSocket.current.close(code, reason)
  }

  // Send a message to the Controller server
  function sendAnonMessage(context, type, data = {}) {
    if (anonWebsocket) {
      controllerAnonSocket.current.send(JSON.stringify({ context, type, data }))
    }
  }

  // Send a message to the Controller server
  function sendAdminMessage(context, type, data = {}) {
    if (adminWebsocket) {
      controllerAdminSocket.current.send(
        JSON.stringify({ context, type, data })
      )
    }
  }

  // Handle inbound messages
  const messageHandler = async (context, type, data = {}) => {
    try {
      console.log(
        `New Message with context: '${context}' and type: '${type}' with data:`,
        data
      )
      switch (context) {
        case 'ERROR':
          switch (type) {
            case 'SERVER_ERROR':
              setNotification(
                `Server Error - ${data.errorCode} \n Reason: '${data.errorReason}'`,
                'error'
              )
              break

            case 'WEBSOCKET_ERROR':
              clearLoadingProcess()
              setErrorMessage(data.error)
              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'INVITATIONS':
          switch (type) {
            case 'INVITATION':
              setQRCodeURL(data.invitation_record.invitation_url)
              break

            case 'INVITATIONS_ERROR':
              // console.log(data.error)
              // console.log('Invitations Error')
              setErrorMessage(data.error)

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'CONTACTS':
          switch (type) {
            case 'CONTACTS':
              // let oldContacts = contacts
              // let newContacts = data.contacts
              // let updatedContacts = []
              // // (mikekebert) Loop through the new contacts and check them against the existing array
              // newContacts.forEach((newContact) => {
              //   oldContacts.forEach((oldContact, index) => {
              //     if (
              //       oldContact !== null &&
              //       newContact !== null &&
              //       oldContact.contact_id === newContact.contact_id
              //     ) {
              //       // (mikekebert) If you find a match, delete the old copy from the old array
              //       oldContacts.splice(index, 1)
              //     }
              //   })
              //   updatedContacts.push(newContact)
              // })
              let updatedContacts = data.contacts

              // (mikekebert) When you reach the end of the list of new contacts, simply add any remaining old contacts to the new array
              // if (oldContacts.length > 0)
              //   updatedContacts = [...updatedContacts, ...oldContacts]

              // (mikekebert) Sort the array by data created, newest on top
              updatedContacts.sort((a, b) =>
                a.created_at < b.created_at ? 1 : -1
              )

              setContacts(updatedContacts)
              removeLoadingProcess('CONTACTS')
              break

            case 'CONTACTS_ERROR':
              // console.log(data.error)
              // console.log('Contacts Error')
              setErrorMessage(data.error)

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'OUT_OF_BAND':
          switch (type) {
            case 'INVITATION':
              setQRCodeURL(data.invitation_record)
              break

            case 'INVITATIONS_ERROR':
              // console.log(data.error)
              // console.log('Invitations Error')
              setErrorMessage(data.error)

              break
            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'DEMOGRAPHICS':
          switch (type) {
            case 'DEMOGRAPHICS_ERROR':
              // console.log(data.error)
              // console.log('Demographics Error')
              setErrorMessage(data.error)

              break

            case 'CONTACTS_ERROR':
              // console.log(data.error)
              // console.log('CONTACTS ERROR')
              setErrorMessage(data.error)

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'ROLES':
          switch (type) {
            case 'ROLES':
              setRoles((prevRoles) => {
                let oldRoles = prevRoles
                let newRoles = data.roles
                let updatedRoles = []
                // (mikekebert) Loop through the new roles and check them against the existing array
                newRoles.forEach((newRole) => {
                  oldRoles.forEach((oldRole, index) => {
                    if (
                      oldRole !== null &&
                      newRole !== null &&
                      oldRole.role_id === newRole.role_id
                    ) {
                      // (mikekebert) If you find a match, delete the old copy from the old array
                      oldRoles.splice(index, 1)
                    }
                  })
                  updatedRoles.push(newRole)
                })
                // (mikekebert) When you reach the end of the list of new roles, simply add any remaining old roles to the new array
                if (oldRoles.length > 0)
                  updatedRoles = [...updatedRoles, ...oldRoles]

                return updatedRoles
              })
              removeLoadingProcess('ROLES')

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'USERS':
          switch (type) {
            case 'USERS':
              setUsers((prevUsers) => {
                let oldUsers = prevUsers
                let newUsers = data.users
                let updatedUsers = []
                // (mikekebert) Loop through the new users and check them against the existing array
                newUsers.forEach((newUser) => {
                  oldUsers.forEach((oldUser, index) => {
                    if (
                      oldUser !== null &&
                      newUser !== null &&
                      oldUser.user_id === newUser.user_id
                    ) {
                      // (mikekebert) If you find a match, delete the old copy from the old array
                      oldUsers.splice(index, 1)
                    }
                  })
                  updatedUsers.push(newUser)
                })
                // (mikekebert) When you reach the end of the list of new users, simply add any remaining old users to the new array
                if (oldUsers.length > 0)
                  updatedUsers = [...updatedUsers, ...oldUsers]
                // (mikekebert) Sort the array by data created, newest on top
                updatedUsers.sort((a, b) =>
                  a.created_at < b.created_at ? 1 : -1
                )

                return updatedUsers
              })
              removeLoadingProcess('USERS')

              break

            case 'USER':
              let user = data.user[0]
              setUser(user)
              break

            case 'USER_UPDATED':
              setUsers((prevUsers) => {
                return prevUsers.map((x) =>
                  x.user_id === data.updatedUser.user_id ? data.updatedUser : x
                )
              })
              setUser(data.updatedUser)

              break

            case 'PASSWORD_UPDATED':
              // (eldersonar) Replace the user with the updated user based on password)
              setUsers((prevUsers) => {
                return prevUsers.map((x) =>
                  x.user_id === data.updatedUserPassword.user_id
                    ? data.updatedUserPassword
                    : x
                )
              })

              break

            case 'USER_CREATED':
              setUsers((prevUsers) => {
                let updatedUsers = [...prevUsers, data.user[0]]
                return updatedUsers.sort((a, b) =>
                  a.created_at < b.created_at ? 1 : -1
                )
              })
              setUser(data.user[0])

              break

            case 'USER_DELETED':
              setUsers((prevUsers) => {
                const index = prevUsers.findIndex((v) => v.user_id === data)
                let alteredUsers = [...prevUsers]
                alteredUsers.splice(index, 1)
                return alteredUsers
              })

              break

            case 'USER_ERROR':
              // setErrorMessage(data.error)
              setErrorMessage(data.error)
              break

            case 'USER_SUCCESS':
              // console.log('USER SUCCESS')
              setSuccessMessage(data)

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'CREDENTIALS':
          switch (type) {
            case 'CREDENTIALS':
              setCredentials((prevCred) => {
                let oldCredentials = prevCred
                let newCredentials = data.credential_records
                let updatedCredentials = []
                // (mikekebert) Loop through the new credentials and check them against the existing array
                newCredentials.forEach((newCredential) => {
                  oldCredentials.forEach((oldCredential, index) => {
                    if (
                      oldCredential !== null &&
                      newCredential !== null &&
                      oldCredential.credential_exchange_id ===
                        newCredential.credential_exchange_id
                    ) {
                      // (mikekebert) If you find a match, delete the old copy from the old array
                      oldCredentials.splice(index, 1)
                    }
                  })
                  updatedCredentials.push(newCredential)
                  // (mikekebert) We also want to make sure to reset any pending connection IDs so the modal windows don't pop up automatically
                  if (newCredential.connection_id === pendingConnectionID) {
                    setPendingConnectionID('')
                  }
                })
                // (mikekebert) When you reach the end of the list of new credentials, simply add any remaining old credentials to the new array
                if (oldCredentials.length > 0)
                  updatedCredentials = [
                    ...updatedCredentials,
                    ...oldCredentials,
                  ]
                // (mikekebert) Sort the array by data created, newest on top
                updatedCredentials.sort((a, b) =>
                  a.created_at < b.created_at ? 1 : -1
                )

                return updatedCredentials
              })
              removeLoadingProcess('CREDENTIALS')
              break

            case 'CREDENTIALS_ERROR':
              // console.log(data.error)
              // console.log('CREDENTIALS ERROR')
              setErrorMessage(data.error)

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }

          break
        case 'PRESENTATIONS':
          switch (type) {
            case 'TRUSTED_TRAVELER_VERIFIED':
              setPendingConnectionID(data.connection_id)
              setVerifiedCredential(data.revealed_attrs)
              setVerificationStatus(true)

              break

            case 'VERIFICATION_FAILED':
              setVerifiedCredential('')
              setVerificationStatus(false)

              break

            case 'PRESENTATION_REPORTS':
              setPresentationReports((prevPresentations) => {
                let oldPresentations = prevPresentations
                let newPresentations = data.presentation_reports
                let updatedPresentations = []

                // (mikekebert) Loop through the new presentation and check them against the existing array
                newPresentations.forEach((newPresentation) => {
                  oldPresentations.forEach((oldPresentation, index) => {
                    if (
                      oldPresentation !== null &&
                      newPresentation !== null &&
                      oldPresentation.presentation_exchange_id ===
                        newPresentation.presentation_exchange_id
                    ) {
                      // (mikekebert) If you find a match, delete the old copy from the old array
                      // console.log('splice', oldPresentation)
                      oldPresentations.splice(index, 1)
                    }
                  })
                  updatedPresentations.push(newPresentation)
                  // (mikekebert) We also want to make sure to reset any pending connection IDs so the modal windows don't pop up automatically
                  if (newPresentation.connection_id === pendingConnectionID) {
                    setPendingConnectionID('')
                  }
                })
                // (mikekebert) When you reach the end of the list of new presentations, simply add any remaining old presentations to the new array
                if (oldPresentations.length > 0)
                  updatedPresentations = [
                    ...updatedPresentations,
                    ...oldPresentations,
                  ]
                // (mikekebert) Sort the array by date created, newest on top
                updatedPresentations.sort((a, b) =>
                  a.created_at < b.created_at ? 1 : -1
                )

                return updatedPresentations
              })
              removeLoadingProcess('PRESENTATIONS')

              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'SERVER':
          switch (type) {
            case 'ANON_WEBSOCKET_READY':
              setReadyForAnonMessages(true)
              break

            case 'ADMIN_WEBSOCKET_READY':
              setReadyForAdminMessages(true)
              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'SETTINGS':
          switch (type) {
            case 'SETTINGS_THEME':
              // Writing the recent theme to a local storage
              const stringMessageTheme = JSON.stringify(data.value)
              window.localStorage.setItem('recentTheme', stringMessageTheme)
              setTheme(data.value)
              removeLoadingProcess('THEME')
              break

            case 'SETTINGS_SCHEMAS':
              setSchemas(data)
              removeLoadingProcess('SCHEMAS')
              break

            case 'LOGO':
              setImage(data)
              removeLoadingProcess('LOGO')
              break

            case 'SETTINGS_ORGANIZATION':
              setOrganizationName(data.organizationName)
              setSiteTitle(data.title)
              removeLoadingProcess('ORGANIZATION')
              break

            case 'SETTINGS_SMTP':
              setSmtp(data.value)
              removeLoadingProcess('SMTP')
              break

            case 'SETTINGS_ERROR':
              // console.log('Settings Error:', data.error)
              setErrorMessage(data.error)
              break

            case 'SETTINGS_SUCCESS':
              setSuccessMessage(data)
              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'IMAGES':
          switch (type) {
            case 'IMAGE_LIST':
              setImage(data)
              removeLoadingProcess('IMAGES')
              break

            case 'IMAGES_ERROR':
              // console.log('Images Error:', data.error)
              setErrorMessage(data.error)
              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'ORGANIZATION':
          switch (type) {
            case 'ORGANIZATION_NAME':
              setOrganizationName(data[0].value.name)

              removeLoadingProcess('ORGANIZATION')
              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        case 'GOVERNANCE':
          switch (type) {
            case 'PRIVILEGES_ERROR':
              console.log(data)
              console.log('Privileges Error', data.error)
              setErrorMessage(data.error)
              removeLoadingProcess('GOVERNANCE')
              break

            case 'PRIVILEGES_SUCCESS':
              console.log('PRIVILEGES SUCCESS')
              console.log('these are the privileges:')
              console.log(data.privileges)
              setPrivileges(data.privileges)
              removeLoadingProcess('GOVERNANCE')
              break

            default:
              setNotification(
                `Error - Unrecognized Websocket Message Type: ${type}`,
                'error'
              )
              break
          }
          break

        default:
          setNotification(
            `Error - Unrecognized Websocket Message Type: ${context}`,
            'error'
          )
          break
      }
    } catch (error) {
      console.log('Error caught:', error)
      setNotification('Client Error - Websockets', 'error')
    }
  }

  function addLoadingProcess(process) {
    if (!session && !loggedIn) {
      anonLoadingList.push(process)
    } else {
      adminLoadingList.push(process)
    }
  }

  function clearLoadingProcess() {
    adminLoadingList = []
    anonLoadingList = []
    setAppIsLoaded(true)
  }

  function removeLoadingProcess(process) {
    if (!session && !loggedIn) {
      const index = anonLoadingList.indexOf(process)
      if (index > -1) {
        anonLoadingList.splice(index, 1)
      }

      if (anonLoadingList.length === 0) {
        setAppIsLoaded(true)
      }
    } else {
      const index = adminLoadingList.indexOf(process)
      if (index > -1) {
        adminLoadingList.splice(index, 1)
      }

      if (adminLoadingList.length === 0) {
        setAppIsLoaded(true)
      }
    }
  }

  function setUpUser(id, username, roles) {
    setSession(cookies.get('sessionId'))
    setLoggedInUserId(id)
    setLoggedInUsername(username)
    setLoggedInRoles(roles)
  }

  // Update theme state locally
  const updateTheme = (update) => {
    return setTheme((prevTheme) => ({ ...prevTheme, ...update }))
  }

  // Update theme in the database
  const saveTheme = () => {
    sendAdminMessage('SETTINGS', 'SET_THEME', theme)
  }

  //(RomanStepanyan) Removing all styles from an array of styles to desible undo button
  const clearStylesArray = () => {
    setStylesArray([])
  }

  const addStylesToArray = (key) => {
    let position = stylesArray.indexOf(key)
    // if cannot find indexOf style
    if (!~position) {
      setStylesArray((oldArray) => [...oldArray, `${key}`])
    }
  }

  const removeStylesFromArray = (undoKey) => {
    // Removing a style from an array of styles
    let index = stylesArray.indexOf(undoKey)
    if (index > -1) {
      stylesArray.splice(index, 1)
      setStylesArray(stylesArray)
    }
  }

  // Undo theme change
  const undoStyle = (undoKey) => {
    if (undoKey !== undefined) {
      for (let key in defaultTheme)
        if ((key = undoKey)) {
          const undo = { [`${key}`]: defaultTheme[key] }
          return setTheme((prevTheme) => ({ ...prevTheme, ...undo }))
        }
    }
  }

  // Resetting state of error and success messages
  const clearResponseState = () => {
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  // Logout and redirect
  const handleLogout = (history) => {
    Axios({
      method: 'POST',
      url: '/api/user/log-out',
      withCredentals: true,
    }).then((res) => {
      setLoggedIn(false)
      setSession('')
      setAdminWebsocket(false)
      setLoggedInUserState(null)
      setLoggedInUserId('')
      setLoggedInUsername('')
      setLoggedInRoles([])

      // (eldersonar) Does this close the connection and remove the connection object?
      closeWSConnection(1000, 'Log out')
      if (history !== undefined) {
        history.push('/login')
      }
    })
  }

  if ((loggedIn && !appIsLoaded) || (!loggedIn && !appIsLoaded)) {
    // Show the spinner while the app is loading
    return (
      <ThemeProvider theme={theme}>
        <FullPageSpinner />
      </ThemeProvider>
    )
  } else if (!loggedIn && appIsLoaded) {
    return (
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <Router>
            <Switch>
              <Route
                path="/forgot-password"
                render={({ history }) => {
                  return (
                    <Frame id="app-frame">
                      <Main>
                        <ForgotPassword
                          logo={image}
                          history={history}
                          sendRequest={sendAdminMessage}
                          user={user}
                          users={users}
                        />
                      </Main>
                    </Frame>
                  )
                }}
              />
              <Route
                path="/password-reset"
                render={({ history }) => {
                  return (
                    <Frame id="app-frame">
                      <Main>
                        <PasswordReset
                          logo={image}
                          history={history}
                          sendRequest={sendAdminMessage}
                          user={user}
                          users={users}
                        />
                      </Main>
                    </Frame>
                  )
                }}
              />
              <Route
                path="/account-setup"
                render={({ history }) => {
                  return (
                    <Frame id="app-frame">
                      <Main>
                        <AccountSetup
                          logo={image}
                          history={history}
                          sendRequest={sendAdminMessage}
                          messageHandler={messageHandler}
                          user={user}
                          users={users}
                        />
                      </Main>
                    </Frame>
                  )
                }}
              />
              <Route
                path="/admin/login"
                render={({ history }) => {
                  return (
                    <Frame id="app-frame">
                      <Main>
                        <Login
                          logo={image}
                          history={history}
                          setUpUser={setUpUser}
                          sendRequest={sendAdminMessage}
                          setLoggedIn={setLoggedIn}
                        />
                      </Main>
                    </Frame>
                  )
                }}
              />
              <Route
                path="/"
                exact
                render={() => {
                  return (
                    <Root
                      anonWebsocket={anonWebsocket}
                      readyForAnonMessages={readyForAnonMessages}
                      QRCodeURL={QRCodeURL}
                      sendRequest={sendAnonMessage}
                      contacts={contacts}
                      verificationStatus={verificationStatus}
                      verifiedCredential={verifiedCredential}
                    />
                  )
                }}
              />
              <Route exact path="/admin">
                <Redirect to="/admin/login" />
              </Route>
              <Route path="/:any">
                <Redirect to="/" />
              </Route>
            </Switch>
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    )
  } else {
    // loggedIn and appIsLoaded
    return (
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <SessionProvider logout={handleLogout} sessionTimer={sessionTimer}>
            <Router>
              <Switch>
                <Route
                  path="/admin"
                  render={() => {
                    return (
                      <AdminRoute
                        loggedInUserState={loggedInUserState}
                        rules={rules}
                        check={check}
                        schemas={schemas}
                        image={image}
                        privileges={privileges}
                        organizationName={organizationName}
                        loggedInUsername={loggedInUsername}
                        handleLogout={handleLogout}
                        sendMessage={sendAdminMessage}
                        QRCodeURL={QRCodeURL}
                        contacts={contacts}
                        credentials={credentials}
                        roles={roles}
                        users={users}
                        user={user}
                        successMessage={successMessage}
                        errorMessage={errorMessage}
                        clearResponseState={clearResponseState}
                        updateTheme={updateTheme}
                        saveTheme={saveTheme}
                        undoStyle={undoStyle}
                        stylesArray={stylesArray}
                        clearStylesArray={clearStylesArray}
                        theme={theme}
                        addStylesToArray={addStylesToArray}
                        removeStylesFromArray={removeStylesFromArray}
                        presentationReports={presentationReports}
                        smtp={smtp}
                      />
                    )
                  }}
                />
                {/* Redirect to root if no route match is found */}
                <Route render={() => <Redirect to="/admin" />} />
              </Switch>
            </Router>
          </SessionProvider>
        </NotificationProvider>
      </ThemeProvider>
    )
  }
}

export default App
