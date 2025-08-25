import type { ReadAlongData, ReadAlongSegment } from '@shared/schema';

// Demo data generator for testing read-along functionality
export function generateDemoReadAlongData(chapterId: string): ReadAlongData {
  const demoText = `
Welcome to this comprehensive course on risk management and insurance principles. In today's rapidly evolving business landscape, understanding risk assessment has become more crucial than ever before.

Risk management is the systematic process of identifying, analyzing, and responding to risk factors throughout the life of a project or business operation. This process involves several key components that we'll explore in detail.

The first component is risk identification, which involves recognizing potential threats that could impact your organization. These threats can range from natural disasters and cyber attacks to market volatility and regulatory changes.

Once risks are identified, the next step is risk assessment. This involves evaluating the likelihood of each risk occurring and the potential impact it could have on your business operations. This assessment helps prioritize which risks require immediate attention.

Risk mitigation strategies then come into play, involving the development of plans to minimize, transfer, or eliminate identified risks. Common strategies include insurance coverage, diversification, and contingency planning.

Finally, continuous monitoring ensures that risk management strategies remain effective as business conditions change. Regular reviews and updates to risk management plans are essential for maintaining organizational resilience.
  `.trim();

  const segments: ReadAlongSegment[] = [
    // Paragraph 1
    {
      id: 'seg_1',
      segmentIndex: 0,
      segmentType: 'sentence',
      text: 'Welcome to this comprehensive course on risk management and insurance principles.',
      startTime: 0,
      endTime: 4.5,
      characterStart: 0,
      characterEnd: 74
    },
    {
      id: 'seg_2',
      segmentIndex: 1,
      segmentType: 'sentence',
      text: "In today's rapidly evolving business landscape, understanding risk assessment has become more crucial than ever before.",
      startTime: 4.5,
      endTime: 10.2,
      characterStart: 75,
      characterEnd: 189
    },

    // Paragraph 2
    {
      id: 'seg_3',
      segmentIndex: 2,
      segmentType: 'sentence',
      text: 'Risk management is the systematic process of identifying, analyzing, and responding to risk factors throughout the life of a project or business operation.',
      startTime: 11,
      endTime: 17.5,
      characterStart: 191,
      characterEnd: 338
    },
    {
      id: 'seg_4',
      segmentIndex: 3,
      segmentType: 'sentence',
      text: "This process involves several key components that we'll explore in detail.",
      startTime: 17.5,
      endTime: 21.8,
      characterStart: 339,
      characterEnd: 412
    },

    // Paragraph 3
    {
      id: 'seg_5',
      segmentIndex: 4,
      segmentType: 'sentence',
      text: 'The first component is risk identification, which involves recognizing potential threats that could impact your organization.',
      startTime: 22.5,
      endTime: 28.2,
      characterStart: 414,
      characterEnd: 532
    },
    {
      id: 'seg_6',
      segmentIndex: 5,
      segmentType: 'sentence',
      text: 'These threats can range from natural disasters and cyber attacks to market volatility and regulatory changes.',
      startTime: 28.2,
      endTime: 33.5,
      characterStart: 533,
      characterEnd: 640
    },

    // Paragraph 4
    {
      id: 'seg_7',
      segmentIndex: 6,
      segmentType: 'sentence',
      text: 'Once risks are identified, the next step is risk assessment.',
      startTime: 34.2,
      endTime: 37.8,
      characterStart: 642,
      characterEnd: 699
    },
    {
      id: 'seg_8',
      segmentIndex: 7,
      segmentType: 'sentence',
      text: 'This involves evaluating the likelihood of each risk occurring and the potential impact it could have on your business operations.',
      startTime: 37.8,
      endTime: 44.5,
      characterStart: 700,
      characterEnd: 826
    },
    {
      id: 'seg_9',
      segmentIndex: 8,
      segmentType: 'sentence',
      text: 'This assessment helps prioritize which risks require immediate attention.',
      startTime: 44.5,
      endTime: 48.2,
      characterStart: 827,
      characterEnd: 896
    },

    // Paragraph 5
    {
      id: 'seg_10',
      segmentIndex: 9,
      segmentType: 'sentence',
      text: 'Risk mitigation strategies then come into play, involving the development of plans to minimize, transfer, or eliminate identified risks.',
      startTime: 49,
      endTime: 55.5,
      characterStart: 898,
      characterEnd: 1032
    },
    {
      id: 'seg_11',
      segmentIndex: 10,
      segmentType: 'sentence',
      text: 'Common strategies include insurance coverage, diversification, and contingency planning.',
      startTime: 55.5,
      endTime: 59.8,
      characterStart: 1033,
      characterEnd: 1118
    },

    // Paragraph 6
    {
      id: 'seg_12',
      segmentIndex: 11,
      segmentType: 'sentence',
      text: 'Finally, continuous monitoring ensures that risk management strategies remain effective as business conditions change.',
      startTime: 60.5,
      endTime: 66.2,
      characterStart: 1120,
      characterEnd: 1234
    },
    {
      id: 'seg_13',
      segmentIndex: 12,
      segmentType: 'sentence',
      text: 'Regular reviews and updates to risk management plans are essential for maintaining organizational resilience.',
      startTime: 66.2,
      endTime: 71.8,
      characterStart: 1235,
      characterEnd: 1340
    }
  ];

  // Add some word-level segments for demonstration
  const wordSegments: ReadAlongSegment[] = [
    {
      id: 'word_1',
      segmentIndex: 100,
      segmentType: 'word',
      text: 'Risk',
      startTime: 11,
      endTime: 11.5,
      wordIndex: 0,
      characterStart: 191,
      characterEnd: 195
    },
    {
      id: 'word_2',
      segmentIndex: 101,
      segmentType: 'word',
      text: 'management',
      startTime: 11.5,
      endTime: 12.2,
      wordIndex: 1,
      characterStart: 196,
      characterEnd: 206
    },
    {
      id: 'word_3',
      segmentIndex: 102,
      segmentType: 'word',
      text: 'is',
      startTime: 12.2,
      endTime: 12.4,
      wordIndex: 2,
      characterStart: 207,
      characterEnd: 209
    }
  ];

  return {
    chapterId,
    textContent: demoText,
    hasReadAlong: true,
    segments: [...segments, ...wordSegments]
  };
}

// Sample chapter data with read-along enabled
export const demoChaptersWithReadAlong = [
  {
    id: 'chapter-risk-mgmt-1',
    title: 'Introduction to Risk Management',
    hasReadAlong: true
  },
  {
    id: 'chapter-risk-mgmt-2', 
    title: 'Risk Assessment Fundamentals',
    hasReadAlong: true
  },
  {
    id: 'chapter-risk-mgmt-3',
    title: 'Mitigation Strategies',
    hasReadAlong: false
  }
];

// Utility to check if a chapter has read-along data
export function hasReadAlongSupport(chapterId: string): boolean {
  return demoChaptersWithReadAlong.some(
    chapter => chapter.id === chapterId && chapter.hasReadAlong
  );
}

// Get demo data for testing
export function getDemoReadAlongData(chapterId: string): ReadAlongData | null {
  if (!hasReadAlongSupport(chapterId)) {
    return null;
  }
  
  return generateDemoReadAlongData(chapterId);
}