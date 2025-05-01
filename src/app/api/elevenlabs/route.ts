import { NextRequest } from "next/server";
import { ElevenLabsClient } from "elevenlabs";
import { auditLog, authorizeSaasContext } from "@/lib/generic-api";
import { getErrorMessage } from "@/lib/utils";
import { authorizeRequestContext } from "@/lib/authorization-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentName, promptText, firstMessage, tools } = body;

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key is not configured" },
        { status: 500 }
      );
    }

    // Initialize ElevenLabs client with API key from environment
    const elevenLabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    console.log("== tools == ", tools);
    console.log("== craete agent input == ", {
      name: agentName,
      conversation_config: {
        agent: {
          prompt: {
            llm: "gpt-4o-mini",
            temperature: 0.5,
            max_tokens: -1,
            prompt: promptText,
            tools: tools,
          },
        },
        // first_message: firstMessage,
      },
    });

    // Create the agent using ElevenLabs API
    const response = await elevenLabs.conversationalAi.createAgent({
      name: agentName,
      conversation_config: {
        agent: {
          prompt: {
            llm: "gpt-4o-mini",
            temperature: 0.5,
            max_tokens: -1,
            prompt: promptText,
            tools: tools,
          },
        },
        // first_message: firstMessage,
      },
    });

    return NextResponse.json({
      agent_id: response.agent_id,
      status: 200,
    });
  } catch (error: any) {
    console.error("Error creating ElevenLabs agent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ElevenLabs agent" },
      { status: 500 }
    );
  }
}
