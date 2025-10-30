'use server';
/**
 * @fileOverview Converts free-form drawings of shapes and text into clean, digital versions.
 *
 * - recognizeShapeAndText - A function that takes a drawing as input and returns enhanced shapes and text.
 * - ShapeAndTextInput - The input type for the recognizeShapeAndText function.
 * - ShapeAndTextOutput - The return type for the recognizeShapeAndText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ShapeAndTextInputSchema = z.object({
  drawingDataUri: z
    .string()
    .describe(
      "A drawing containing shapes and/or text, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ShapeAndTextInput = z.infer<typeof ShapeAndTextInputSchema>;

const ShapeAndTextOutputSchema = z.object({
  enhancedDrawing: z.string().describe('A data URI of the enhanced drawing with cleaned shapes and text.'),
});
export type ShapeAndTextOutput = z.infer<typeof ShapeAndTextOutputSchema>;

export async function recognizeShapeAndText(input: ShapeAndTextInput): Promise<ShapeAndTextOutput> {
  return recognizeShapeAndTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'shapeAndTextRecognitionPrompt',
  input: {schema: ShapeAndTextInputSchema},
  output: {schema: ShapeAndTextOutputSchema},
  prompt: `You are an AI assistant that cleans up user drawings of shapes and text.

You will receive a drawing as a data URI.  Your goal is to identify the shapes and text in the drawing, and then generate a new, cleaned-up version of the drawing where the shapes are rendered as clean digital shapes, and the text is rendered as clear, readable text.

Here is the drawing: {{media url=drawingDataUri}}

Return the cleaned-up drawing as a data URI.
`,
});

const recognizeShapeAndTextFlow = ai.defineFlow(
  {
    name: 'recognizeShapeAndTextFlow',
    inputSchema: ShapeAndTextInputSchema,
    outputSchema: ShapeAndTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
