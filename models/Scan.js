import mongoose from 'mongoose';

const ScanSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  cloudinaryId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'complete', 'failed'],
    default: 'pending',
  },
  error: {
    type: String,
    default: null,
  },
  result: {
    identified: { type: Boolean, default: false },
    commonName: { type: String, default: 'Analyzing...' },
    scientificName: { type: String, default: '' },
    family: { type: String, default: '' },
    description: { type: String, default: '' },
    flowerImageUrl: { type: String, default: '' },
    flowerImageUrls: [{ type: String }],
    seedImageUrls: [{ type: String }],
    flowerSearchQuery: { type: String, default: '' },
    planting: {
      bestSeason: { type: String, default: '' },
      avoidSeason: { type: String, default: '' },
      soilType: { type: String, default: '' },
      sunlight: { type: String, default: '' },
      waterNeeds: { type: String, default: '' },
      spacing: { type: String, default: '' },
      depth: { type: String, default: '' },
      germination: { type: String, default: '' },
      daysToFlower: { type: String, default: '' },
      idealClimate: { type: String, default: '' },
      bloomingSeason: { type: String, default: '' },
      sunlightHours: { type: String, default: '' },
      monthlyPlantingSpectrum: [{
        month: { type: String },
        rating: { type: String },
        reason: { type: String }
      }]
    },
    care: {
      fertilizer: { type: String, default: '' },
      pests: { type: String, default: '' },
      diseases: { type: String, default: '' },
      tips: [{ type: String }],
      companionPlants: [{ type: String }],
      toxicity: { type: String, default: '' },
    },
    lifecycle: { type: String, default: '' },
    thingsToWatchOutFor: { type: String, default: '' },
    difficulty: { type: String, default: '' },
    zones: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

export default mongoose.models.Scan || mongoose.model('Scan', ScanSchema);
