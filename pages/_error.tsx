import React from 'react'
import NextErrorComponent from 'next/error'

function ErrorPage(props: any) {
  return <NextErrorComponent statusCode={props.statusCode} />
}

ErrorPage.getInitialProps = async (context: any) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps(context)
  return errorInitialProps
}

export default ErrorPage
