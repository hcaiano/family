export class OpenRouter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText({
    model,
    messages,
  }: {
    model: string;
    messages: { role: string; content: string }[];
  }): Promise<string> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.VERCEL_URL || "http://localhost:3000",
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
