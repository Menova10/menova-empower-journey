"use client"

import { useEffect, useState } from "react"

export default function VapiAssistant() {
  const [vapi, setVapi] = useState(null)
  const [status, setStatus] = useState("Ready")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [errorMessage, setErrorMessage] = useState("")
  const [isApiKeyValid, setIsApiKeyValid] = useState(true)

  // Initialize Vapi on client-side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@vapi-ai/web").then((module) => {
        const Vapi = module.default

        // Get API key from environment variables - only check once
        const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY || ""

        if (!apiKey) {
          setErrorMessage("API key is missing. Please check your environment variables.")
          setStatus("Error")
          setIsApiKeyValid(false)
          return
        }

        // Initialize Vapi
        const vapiInstance = new Vapi(apiKey)
        setVapi(vapiInstance)
        setIsApiKeyValid(true)

        // Set up event listeners
        vapiInstance.on("call-start", () => {
          setIsConnecting(false)
          setIsConnected(true)
          setErrorMessage("")
          setStatus("Connected")
        })

        vapiInstance.on("call-end", () => {
          setIsConnecting(false)
          setIsConnected(false)
          setStatus("Call ended")
        })

        vapiInstance.on("speech-start", () => {
          setIsSpeaking(true)
        })

        vapiInstance.on("speech-end", () => {
          setIsSpeaking(false)
        })

        vapiInstance.on("volume-level", (level) => {
          setVolumeLevel(level)
        })

        vapiInstance.on("error", (error) => {
          console.error("Vapi error:", error)
          setIsConnecting(false)

          // Handle different types of errors
          if (error?.error?.message?.includes("card details")) {
            setErrorMessage("Payment required. Visit the Vapi dashboard to set up your payment method.")
          } else if (error?.error?.statusCode === 401 || error?.error?.statusCode === 403) {
            // API key is invalid - update state
            setErrorMessage("API key is invalid. Please check your environment variables.")
            setIsApiKeyValid(false)
          } else {
            setErrorMessage(error?.error?.message || "An error occurred")
          }

          setStatus("Error")
        })
      })
    }

    // Cleanup function
    return () => {
      if (vapi) {
        vapi.stop()
      }
    }
  }, [])

  // Start call function - no need to recheck API key
  const startCall = () => {
    if (!isApiKeyValid) {
      setErrorMessage("Cannot start call: API key is invalid or missing.")
      return
    }

    setIsConnecting(true)
    setStatus("Connecting...")
    setErrorMessage("")

    vapi.start(assistantOptions)
  }

  // End call function
  const endCall = () => {
    if (vapi) {
      vapi.stop()
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px",
        color: "white",
      }}
    >
      <h1 style={{ marginBottom: "30px" }}>Vapi Voice Assistant</h1>

      <div style={{ marginBottom: "20px" }}>
        <p>Status: {status}</p>

        {isConnected && (
          <div style={{ marginTop: "10px" }}>
            <p>{isSpeaking ? "Assistant is speaking" : "Assistant is listening"}</p>
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: isSpeaking ? "#00ff00" : "#ffff00",
                margin: "10px auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                transform: `scale(${1 + volumeLevel / 100})`,
                transition: "transform 0.1s ease",
              }}
            >
              🎤
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              backgroundColor: "#ff4444",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              marginTop: "10px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px" }}>{errorMessage}</p>
          </div>
        )}

        {!isApiKeyValid && (
          <div
            style={{
              backgroundColor: "#ff6b35",
              color: "white",
              padding: "15px",
              borderRadius: "8px",
              marginTop: "15px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>Configuration Required</p>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Please add your Vapi API key to the environment variables and restart the application.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={isConnected ? endCall : startCall}
        disabled={isConnecting || !isApiKeyValid}
        style={{
          backgroundColor: isConnected ? "#f03e3e" : "white",
          color: isConnected ? "white" : "black",
          border: "none",
          borderRadius: "8px",
          padding: "12px 24px",
          fontSize: "16px",
          fontWeight: "500",
          cursor: isConnecting || !isApiKeyValid ? "not-allowed" : "pointer",
          opacity: isConnecting || !isApiKeyValid ? 0.7 : 1,
        }}
      >
        {isConnecting ? "Connecting..." : isConnected ? "End Call" : "Start Conversation"}
      </button>

      <a
        href="https://docs.vapi.ai"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          top: "25px",
          right: "25px",
          padding: "5px 10px",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "5px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        }}
      >
        Vapi Docs
      </a>
    </div>
  )
}

// Generic assistant configuration
const assistantOptions = {
  name: "Vapi Assistant",
  firstMessage: "Hello! How can I assist you today I am  Chatty?",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en-US",
  },
  voice: {
    provider: "playht",
    voiceId: "jennifer",
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a helpful and friendly AI voice assistant. Answer questions, provide information, and assist the user in a conversational and concise manner. If you don't know the answer, politely let the user know. Keep responses short and natural, as this is a voice conversation.`,
      },
    ],
  },
} 