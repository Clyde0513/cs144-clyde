import mongoose from 'mongoose';
import { LiftBatch } from '../models/LiftBatch.js';
import { TrailBatch } from '../models/TrailBatch.js';
import { BatchType } from '../models/Enum.js';
import { USE_DB } from './dbconfig.js';
import { loadFixtureLatest, loadFixtureNearest } from './fixtures.js';

// Utility: choose Mongoose model by batch type
function getBatchModel(type) {
  switch (type) {
    case BatchType.LiftBatch:  return LiftBatch;
    case BatchType.TrailBatch: return TrailBatch;
    default: throw new Error(`Unknown batch type: ${type}`);
  }
}

// Get the latest batch of the given type.
//
// When USE_DB=false (default), reads from fixtures/*.json.
// When USE_DB=true, queries MongoDB — that path is YOUR job to implement.
export async function getLatestBatch(type) {
  if (!USE_DB) {
    return loadFixtureLatest(type);
  }

  // TODO: query MongoDB for the most recent batch of this type and return it.
  // Hint: getBatchModel(type) gives you the right Mongoose model.

  const model = getBatchModel(type);
  const latestBatch = await model.findOne({ type }).sort({ timestamp: -1 }).exec();
  return latestBatch ? latestBatch.toObject() : null;
  // console.log("getLatestBatch (mongo) not yet implemented");
  // return null;
}

// Get the most recent batch with timestamp <= ts.
// Example: query for 11:00, latest batch before is 9:00 → returns the 9:00 batch.
//
// When USE_DB=false, the fixture file contains a single batch;
// it is returned iff ts is at or after that batch's timestamp, else null.
// When USE_DB=true, YOU implement the query.
export async function getNearestBatch(type, ts) {
  if (!USE_DB) {
    return loadFixtureNearest(type, ts);
  }

  // TODO: query MongoDB for the most recent batch of this type with
  // timestamp <= ts, and return it. Return null if no such batch exists.
  const model = getBatchModel(type);
  const nearestBatch = await model.findOne({ type, timestamp: { $lte: ts } }).sort({ timestamp: -1 }).exec();
  return nearestBatch ? nearestBatch.toObject() : null;
  // console.log("getNearestBatch (mongo) not yet implemented");
  // return null;
}

export default { getLatestBatch, getNearestBatch };
