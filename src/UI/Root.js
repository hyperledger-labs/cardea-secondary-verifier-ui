import React, { Component, useEffect, useState } from 'react'
import './Root.css'
import avatar from '../assets/cardea.png'
import logo from '../assets/CARDEA-Logo.png'
import QRCode from 'qrcode.react'
import styled from 'styled-components'

function Root(props) {
  const QR = styled(QRCode)`
    display: block;
    margin: auto;
    padding: 10px;
    width: 300px;
  `
  const [waitingForInvitation, setWaitingForInvitation] = useState(false)
  const [waitingForConnection, setWaitingForConnection] = useState(false)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (
      !waitingForInvitation &&
      props.anonWebsocket &&
      props.readyForAnonMessages
    ) {
      props.sendRequest('INVITATIONS', 'CREATE_SINGLE_USE', {})
      setWaitingForInvitation(true)
    }
  }, [props.anonWebsocket, props.readyForAnonMessages])

  useEffect(() => {
    if (props.QRCodeURL !== '') {
      setWaitingForConnection(true)
    }
    if (props.contacts.length > 0 && waitingForConnection) {
      setConnected(true)
    }
  }, [props.QRCodeURL, props.contacts, waitingForConnection])
  console.log(props.verifiedCredential)
  return (
    <>
      <div className="landing-container-fluid">
        <div className="landing-row">
          <div className="home landing-col s12">
            <div className="landing-col upper-fold">
              <img src={logo} className="img-fluid" alt="" />
              <div className="landing-container">
                <div className="landing-row">
                  <div className="avatar-container left-fold landing-col-6">
                    <img src={avatar} className="avatar" alt="" />
                  </div>
                  {connected ? (
                    props.verificationStatus !== undefined ? (
                      props.verificationStatus ? (
                        props.verifiedCredential ? (
                          <div className="right-fold landing-col-6">
                            <h1 className="header">Credentials Verified!</h1>
                            <p className="para">
                              Trusted Traveler ID:{' '}
                              {props.verifiedCredential.trusted_traveler_id.raw}
                            </p>
                          </div>
                        ) : (
                          <div className="right-fold landing-col-6">
                            <h1 className="header">Credentials Verified!</h1>
                            <p className="para">
                              No Credential Data Was Passed
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="right-fold landing-col-6">
                          <h1 className="header">Verification Failed</h1>
                          <p className="para">
                            There was a problem verifying your credential.
                            Please try again or contact support.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="right-fold landing-col-6">
                        <h1 className="header">
                          Verify your trusted traveler credentials
                        </h1>
                        <p className="para">
                          You will now receive a request on your mobile app to
                          send your credential to us for verification
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="right-fold landing-col-6">
                      <h1 className="header">
                        Verify your trusted traveler credentials
                      </h1>
                      <p className="para">
                        Simply scan the following QR code to begin the
                        verification process:
                      </p>
                      {props.QRCodeURL ? (
                        <div className="qr">
                          <p>
                            <QR
                              value={props.QRCodeURL}
                              size={256}
                              renderAs="svg"
                            />
                          </p>
                        </div>
                      ) : (
                        <p>
                          <span>Loading...</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Root
