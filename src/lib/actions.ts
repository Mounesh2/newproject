'use server';

import { recognizeShapeAndText, ShapeAndTextInput } from '@/ai/flows/shape-and-text-recognition';
import { z } from 'zod';

const actionSchema = z.object({
  drawingDataUri: z.string(),
});

type ActionResponse = {
  enhancedDrawing?: string;
  error?: string;
};

export const enhanceWithAI = async (input: ShapeAndTextInput): Promise<ActionResponse> => {
  const parsedInput = actionSchema.safeParse(input);
  if (!parsedInput.success) {
    return { error: 'Invalid input.' };
  }
  
  try {
    const result = await recognizeShapeAndText(parsedInput.data);
    if (!result || !result.enhancedDrawing) {
      return { error: 'AI processing failed to return an image.' };
    }
    return { enhancedDrawing: result.enhancedDrawing };
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred during AI processing.' };
  }
};
