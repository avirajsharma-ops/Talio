/**
 * MAYA Vector Search API Route
 * Endpoint: POST /api/maya/vector-search
 * 
 * This endpoint allows MAYA to perform semantic search across your HRMS data
 */

import { NextResponse } from 'next/server';
import {
  vectorSearch,
  multiCollectionSearch,
  searchEmployees,
  searchAnnouncements,
  searchAssets,
  searchMeetings,
  searchGoals,
} from '@/lib/vectorSearch';

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, type, filters, limit } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    let results;

    // Route to appropriate search function based on type
    switch (type) {
      case 'employees':
        results = await searchEmployees(query, filters);
        break;

      case 'announcements':
        results = await searchAnnouncements(query, filters);
        break;

      case 'assets':
        results = await searchAssets(query, filters);
        break;

      case 'meetings':
        results = await searchMeetings(query, filters);
        break;

      case 'goals':
        results = await searchGoals(query, filters);
        break;

      case 'multi':
      case 'all':
        // Search across multiple collections
        const collections = body.collections || [
          'employees',
          'announcements',
          'assets',
          'departments',
          'companymeetings',
          'dailygoals',
        ];
        results = await multiCollectionSearch({
          query,
          collections,
          limit: limit || 5,
          filters,
        });
        break;

      default:
        // Default: search across all collections
        results = await multiCollectionSearch({
          query,
          limit: limit || 10,
          filters,
        });
    }

    // Format results for MAYA
    const formattedResults = {
      query,
      type: type || 'all',
      count: results.length,
      results: results.map(result => ({
        id: result._id,
        collection: result._collection,
        score: result._searchScore,
        data: result,
      })),
    };

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('Vector search API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      {
        message: 'MAYA Vector Search API',
        usage: {
          method: 'POST',
          endpoint: '/api/maya/vector-search',
          body: {
            query: 'your search query',
            type: 'employees | announcements | assets | meetings | goals | multi | all',
            filters: { department: 'Engineering', status: 'active' },
            limit: 10,
          },
        },
        example: {
          query: 'Find employees with React skills',
          type: 'employees',
          filters: { department: 'Engineering' },
          limit: 5,
        },
      },
      { status: 200 }
    );
  }

  // Simple GET request with query parameter
  try {
    const results = await multiCollectionSearch({
      query,
      limit: 10,
    });

    return NextResponse.json({
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Vector search GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

