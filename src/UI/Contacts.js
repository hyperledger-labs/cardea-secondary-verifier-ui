import React, { useState } from 'react'

// import FormContacts from './FormContacts'
import FormQR from './FormQR'
import { useNotification } from './NotificationProvider'
import PageHeader from './PageHeader'
import PageSection from './PageSection'

import { DataTable, DataRow, DataHeader, DataCell } from './CommonStylesTables'

import { ActionButton } from './CommonStylesForms'

import { CanUser } from './CanUser'

function Contacts(props) {
  const localUser = props.loggedInUserState

  // Accessing notification context
  // const setNotification = useNotification()

  const [contactModalIsOpen, setContactModalIsOpen] = useState(false)

  const closeContactModal = () => setContactModalIsOpen(false)

  function openContact(history, id) {
    if (history !== undefined) {
      history.push('/admin/contacts/' + id)
    }
  }

  // Submits the form and shows notification
  // function submitNewContact(e) {
  //   e.preventDefault()
  //   setNotification('Contact was successfully added!', 'notice')
  // }

  const history = props.history

  const contacts = props.contacts

  const contactRows = contacts.map((contact) => {
    return (
      <DataRow
        key={contact.contact_id}
        onClick={() => {
          openContact(history, contact.contact_id, contact)
        }}
      >
        <DataCell>{contact.label}</DataCell>
        <DataCell>
          {contact.Demographic !== null && contact.Demographic !== undefined
            ? contact.Demographic.mpid || ''
            : ''}
        </DataCell>
        <DataCell>{contact.Connections[0].state}</DataCell>
        <DataCell>{new Date(contact.created_at).toLocaleString()}</DataCell>
      </DataRow>
    )
  })

  return (
    <>
      <div id="contacts">
        <PageHeader title={'Contacts'} />
        <PageSection>
          <DataTable>
            <thead>
              <DataRow>
                <DataHeader>Contact Name</DataHeader>
                <DataHeader></DataHeader>
                <DataHeader>Connection Status</DataHeader>
                <DataHeader>Created At</DataHeader>
              </DataRow>
            </thead>
            <tbody>{contactRows}</tbody>
          </DataTable>
        </PageSection>
        <CanUser
          user={localUser}
          perform="contacts:create"
          yes={() => (
            <ActionButton
              title="Add a New Contact"
              onClick={() => {
                setContactModalIsOpen((o) => !o)
                props.sendRequest('INVITATIONS', 'CREATE_SINGLE_USE', {})
              }}
            >
              +
            </ActionButton>
          )}
        />
        <FormQR
          contactModalIsOpen={contactModalIsOpen}
          closeContactModal={closeContactModal}
          QRCodeURL={props.QRCodeURL}
        />
        {/*<FormContacts
          contactModalIsOpen={contactModalIsOpen}
          closeContactModal={closeContactModal}
          submitContact={submitNewContact}
        />*/}
      </div>
    </>
  )
}

export default Contacts
