import React, { Component, useEffect, useState } from "react";
import "./Root.css";
import avatar from "../assets/cardea.png"
import logo from "../assets/CARDEA-Logo.png"
import QRCode from 'qrcode.react'
import styled from 'styled-components'

function Root(props) {

  const QR = styled(QRCode)`
    display: block;
    margin: auto;
    padding: 10px;
    width: 300px;
  `
  const [waitingForInvitation, setwaitingForInvitation] = useState(false)
  const [waitingForConnection, setWaitingForConnection] = useState(false)
  const [connected, setConnected] = useState(false)

  //TODO there is a bug that causes us to issue to INVITATION requests
  if (!waitingForInvitation) {
    props.sendRequest('INVITATIONS', 'CREATE_SINGLE_USE', {})
    setwaitingForInvitation(true)
  }

  useEffect(() => { 

    if (props.QRCodeURL !== "") {
      setWaitingForConnection(true)
    }
    if (props.contacts.length > 0 && waitingForConnection) {
      setConnected(true)
    }
    
  }, [props.QRCodeURL, props.contacts, waitingForConnection])

  return (
    <>
      <div className="landing-container-fluid">
        <div className="landing-row">
          <div className="home landing-col s12">
            <div className="landing-col upper-fold">
              <img
                src={logo}
                className="img-fluid"
                alt=""
              />
              <div className="landing-container">
                <div className="landing-row">
                  <div className="avatar-container left-fold landing-col-6">
                    <img
                      src={avatar}
                      className="avatar"
                      alt=""
                    />
                  </div>
                  {props.emailVerifiedData ? (
                      <div className="landing-col-6 right-fold">
                        <h1 className="header">Credentials verified!</h1>
                        <h4 className="head"></h4>
                        <p className="para">
                          Email: {props.emailVerifiedData.address.raw}
                        </p>
                    </div>) : (
                      connected ? (
                        <div className="right-fold">
                          <h1 className="header">Verify your email credentials</h1>
                          <h4 className="head"></h4>
                          <p className="para">
                            You will now receive a request on your mobile app to send your credential to us!
                          </p>
                        </div>
                      ) : (
                        <div className="right-fold landing-col-6">

                          <div className="avatar-container inline">
                            <img
                              src={avatar}
                              className="avatar"
                              alt=""
                            />
                          </div>
                          <h1 className="header">Verify your email credentials</h1>
                          <h4 className="head"></h4>
                          <p className="para">
                            Simply scan the following QR code to begin the verification process!
                          </p>
                          <p>
                          {props.QRCodeURL ? (
                              <QR value={props.QRCodeURL} size={256} renderAs="svg" />
                            ) : (
                              <span>Loading...</span>
                            )}
                          </p>
                        </div>
                      )
                    )}          
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Root;
