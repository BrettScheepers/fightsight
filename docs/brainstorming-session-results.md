# Brainstorming Session Results

**Session Date:** 2025-10-25
**Facilitator:** Business Analyst Mary
**Participant:** Brett

---

## Executive Summary

**Topic:** Combat Sport Sparring Video Analysis App - Strike Detection & Analysis Features

**Session Goals:** Define the analysis features for V1 of a combat sport sparring analysis application that can process uploaded videos and generate comprehensive strike reports.

**Techniques Used:** Strategic Discovery & Focused Q&A Exploration (45 minutes)

**Total Ideas Generated:** 25+ distinct concepts across data structures, tooling, and architecture

### Key Themes Identified:

- **MVP Focus**: Strike tracking as the foundational feature for iteration 1
- **Detailed Strike Taxonomy**: Level 3 granularity with stance tracking, zone targeting, and outcome sophistication
- **Hybrid Architecture**: Computer Vision for detection + Language Models for intelligent classification
- **Cost-Conscious Design**: Target under $1-2 per video analysis with cloud APIs, path to self-hosting
- **Smart Scope Management**: 1-6 minute video clips, 5-10 minute processing time acceptable

---

## Discovery Sessions

### Session 1: Strike Data Structure Design

**Duration:** ~15 minutes
**Approach:** Iterative requirements gathering and data modeling

#### Ideas Generated:

1. **Four-Level Strike Type Granularity System**

   - Level 1: Basic (Hand, Kick, Elbow, Knee)
   - Level 2: Intermediate (Jab, Cross, Hook, specific kicks)
   - Level 3: Advanced with modifiers (Lead jab, Rear cross, Switch kick)
   - Level 4: Expert taxonomy (Southpaw rear uppercut, Question mark kick)
   - **Decision: Level 3 for V1**

2. **Four-Level Target Zone Detail**

   - Level 1: Head, Body
   - Level 2: Head, Body, Legs
   - Level 3: Subdivided zones (High/Mid/Low head, Upper/Lower body, Lead/Rear leg)
   - Level 4: Anatomical precision (chin, temple, liver, calf)
   - **Decision: Level 2 for V1**

3. **Four-Level Outcome Sophistication**

   - Level 1: Hit, Miss
   - Level 2: Landed clean, Blocked, Missed, Parried
   - Level 3: Full defensive taxonomy (Landed clean, Partially landed, Blocked, Slipped, Parried, Rolled, Missed, Countered)
   - Level 4: Impact assessment and damage indicators
   - **Decision: Level 3 for V1**

4. **Comprehensive Strike Event Data Structure**

   ```
   Strike Event {
     // Temporal Data
     - timestamp, frame_number, round_number

     // Fighter Identification
     - thrower_id, receiver_id
     - thrower_stance: Orthodox | Southpaw | Switch

     // Strike Classification
     - strike_type: {category, technique, modifier}
     - Examples: Lead Jab, Rear Cross, Switch Roundhouse

     // Target & Impact
     - target_zone: Head | Body | Legs
     - outcome: 8 possible outcomes (Level 3)

     // Contextual Flags
     - is_combination, combination_id, position_in_combo
     - range: Pocket | Mid-range | Long-range
     - initiated_from: Offense | Counter | Defensive response
   }
   ```

5. **Supporting Data Structures**
   - Fighter Profile (id, name, stance, corner_color)
   - Session Metadata (video info, sport type, round structure)
   - Combination Sequences (linked strike events)
   - Data Hierarchy (Session → Fighters → Strike Events → Combinations)

#### Insights Discovered:

- Strike data granularity directly impacts ML model complexity and cost
- Stance tracking is critical for technique classification accuracy
- Combination detection requires temporal analysis (time thresholds)
- Counter strikes create dual-record scenarios needing resolution
- Video frame reference storage enables review and validation

#### Notable Connections:

- Data structure complexity must align with detection tool capabilities
- More detailed taxonomy = more training data required for accuracy
- Combination detection bridges individual strikes into strategic patterns

---

### Session 2: Tool Landscape Exploration

**Duration:** ~10 minutes
**Approach:** Category mapping and capability assessment

#### Ideas Generated:

6. **Computer Vision & Object Detection Tools**

   - OpenCV, YOLO, MediaPipe, Detectron2
   - Use case: Fighter tracking, strike detection, stance recognition

7. **Pose Estimation & Skeletal Tracking**

   - MediaPipe Pose, OpenPose, AlphaPose, MoveNet
   - Use case: Strike classification, target identification, stance detection

8. **Action Recognition & Classification**

   - SlowFast, I3D, X3D, TSM (Temporal Shift Module)
   - Use case: Distinguishing specific strike types, combo identification

9. **Motion Analysis & Tracking**

   - Optical flow algorithms, SORT/DeepSORT
   - Use case: Strike velocity, movement patterns, range detection

10. **AI/ML Frameworks**

    - TensorFlow, PyTorch, Keras
    - Use case: Custom strike classification model training

11. **Video Processing Platforms**
    - FFmpeg, OpenCV, cloud video APIs
    - Use case: Upload handling, frame extraction, processing pipelines

#### Insights Discovered:

- Tool selection should precede finalizing data structure feasibility
- Multiple tool categories needed for complete solution (not single tool)
- Each tool category addresses specific aspect of analysis pipeline

---

### Session 3: Language Model Framework Strategy

**Duration:** ~20 minutes
**Approach:** Strategic discovery through targeted questioning

#### Multimodal LLM Approach Ideas Generated:

12. **Vision-Language Models (VLMs) - Direct Analysis**

    - Models: GPT-4V, Claude 3.5 Sonnet (Vision), Gemini 1.5 Pro, LLaVA
    - Approach: Feed frame sequences with structured prompts
    - Returns JSON with strike classifications
    - **Pros**: No training, nuanced understanding, explainable
    - **Cons**: API costs, slower processing

13. **Fine-tuned Vision Models**

    - Base models: CLIP, BLIP-2, LLaVA
    - Approach: Train on labeled combat sport footage
    - **Pros**: Higher accuracy, optimized taxonomy, local deployment
    - **Cons**: Requires training data, ML expertise, infrastructure

14. **Hybrid LLM + Traditional CV (SELECTED APPROACH)**

    - Pipeline: CV detects candidates → LLM classifies strikes → LLM generates reports
    - **Pros**: Cost-effective, accurate, scalable
    - **Cons**: More complex architecture
    - **Why chosen**: Balances cost (<$1-2/video) with accuracy requirements

15. **LLM as Analysis Engine (Post-Processing)**
    - CV generates raw strike events → LLM analyzes patterns → Natural language insights
    - Use case: Report generation, pattern recognition, coaching insights

#### Architecture Decisions from Discovery:

16. **Cloud API First, Self-Hosted Later**

    - Phase 1: Cloud APIs (OpenAI, Anthropic, Google) for fast validation
    - Phase 2: Self-hosted models for cost optimization
    - Design requirement: Model-agnostic architecture for easy swapping

17. **Cost Optimization Strategies**

    - Frame sampling (analyze key moments, not every frame)
    - CV pre-filtering (reduce LLM API calls)
    - Batch processing for better rates
    - Target: <$1-2 per video analysis

18. **Processing Pipeline Design**

    - Client-side video clipping (1-6 minute constraint)
    - Asynchronous processing (5-10 minute target, 30 min acceptable)
    - Background job queue with notification system

19. **LLM Integration Points**
    - **Detection Layer**: CV identifies motion/pose changes
    - **Classification Layer**: LLM determines strike type, target, outcome
    - **Analysis Layer**: LLM generates insights and natural language reports

#### User Requirements Profile:

20. **Technical Foundation**

    - Basic Python, basic ML, solid cloud infrastructure experience
    - Fullstack application development expertise
    - Still learning LLMs (beginner-friendly approach needed)

21. **Priority Ranking**

    - Priority 1: Cost (<$1-2/video)
    - Priority 2: Accuracy (correct strike identification)
    - Priority 3: Speed (5-10 min acceptable)
    - Priority 4: Explainability (black-box models fine)

22. **Scale Parameters**
    - Video length: 1-6 minutes (client-side clipping)
    - Testing phase: 5-20 videos/day
    - Processing time: 5-10 minutes target, 30 min acceptable
    - Budget: ~$10-40/day during testing

#### Insights Discovered:

- Cost constraints drive hybrid architecture (not pure LLM approach)
- Processing time flexibility enables batch optimization
- Small testing scale allows manual quality review and iteration
- Client-side clipping prevents scope creep and cost blowup
- Cloud-to-self-hosted migration path requires abstraction layer

#### Notable Connections:

- User's fullstack + cloud experience enables serverless architecture
- Cost priority aligns perfectly with hybrid CV + selective LLM approach
- 5-10 minute processing window allows for intelligent batching
- Testing scale makes manual validation feasible for model refinement

---

## Idea Categorization

### Immediate Opportunities

_Ideas ready to implement now_

1. **Hybrid CV + LLM Architecture**

   - Description: Use MediaPipe/YOLO for motion detection, send candidate strikes to cloud LLM API for classification
   - Why immediate: Leverages existing tools, no training required, fits budget constraints
   - Resources needed: MediaPipe/OpenCV setup, API keys (OpenAI/Anthropic/Google), video processing pipeline

2. **Client-Side Video Clipping**

   - Description: Let users trim videos to 1-6 minute clips before upload
   - Why immediate: Simple UI feature, drastically reduces processing costs, improves user experience
   - Resources needed: Frontend video player with trim controls (ffmpeg.js or similar)

3. **Asynchronous Processing Queue**

   - Description: Background job system for video analysis with notification on completion
   - Why immediate: Enables cost-optimized batch processing, users don't wait on screen
   - Resources needed: Job queue (Bull, Celery, or cloud equivalent), notification system

4. **Model-Agnostic LLM Abstraction Layer**
   - Description: Interface that can swap between GPT-4V, Claude, Gemini, or future self-hosted models
   - Why immediate: Critical for future-proofing, enables A/B testing, facilitates migration
   - Resources needed: API wrapper class/service, configuration management

### Future Innovations

_Ideas requiring development/research_

5. **Fine-Tuned Combat Sport Vision Model**

   - Description: Train custom model on labeled sparring footage for higher accuracy
   - Development needed: Dataset collection and labeling (1000+ videos), training infrastructure, evaluation pipeline
   - Timeline estimate: 3-6 months post-MVP

6. **Real-Time Analysis Mode**

   - Description: Process video during upload for near-instant results
   - Development needed: Streaming video processing, optimized model inference, cost optimization at scale
   - Timeline estimate: 6-12 months, requires significant scale

7. **Advanced Metrics Layer**

   - Description: Velocity estimation, force calculation, fatigue indicators, pattern recognition
   - Development needed: Motion analysis algorithms, biomechanics modeling, ML for pattern detection
   - Timeline estimate: Post-V1, 6+ months

8. **Multi-Sport Specialized Models**

   - Description: Separate optimized models for boxing, MMA, kickboxing, Muay Thai, etc.
   - Development needed: Sport-specific datasets, technique taxonomies, model training per sport
   - Timeline estimate: 12+ months, iterative rollout

9. **Combination & Strategy Analysis**
   - Description: Detect combination patterns, strategic tendencies, setup sequences
   - Development needed: Temporal sequence modeling, strategic pattern database, contextual analysis
   - Timeline estimate: 9-12 months

### Moonshots

_Ambitious, transformative concepts_

10. **AI Coaching Recommendations**

    - Description: LLM analyzes patterns and generates personalized coaching advice ("Throw more body shots when opponent is fatigued")
    - Transformative potential: Turns analysis tool into virtual coach, high-value premium feature
    - Challenges to overcome: Requires deep combat sports domain knowledge in prompts, validation by real coaches, liability considerations

11. **Opponent Matchup Analysis**

    - Description: Compare two fighters' styles, predict effective strategies, identify vulnerabilities
    - Transformative potential: Game-planning tool for coaches, competitive advantage insights
    - Challenges to overcome: Requires multiple video analyses per fighter, strategic modeling, domain expertise

12. **Self-Hosted Edge Model Deployment**

    - Description: Run entire analysis pipeline on-device or local infrastructure for zero API costs
    - Transformative potential: Scales to unlimited volume at marginal cost, privacy for professional users
    - Challenges to overcome: GPU infrastructure, model optimization, deployment complexity, maintaining accuracy

13. **Live Competition Scoring & Analysis**
    - Description: Real-time strike tracking during live amateur competitions
    - Transformative potential: Objective judging assistance, broadcast analytics, new market segment
    - Challenges to overcome: Real-time performance requirements, camera positioning, regulatory acceptance

### Insights & Learnings

_Key realizations from the session_

- **Cost is the Primary Architectural Constraint**: Every technical decision flows from the <$1-2/video target. This drives hybrid approach, frame sampling, and batch processing design.

- **Hybrid Architectures Leverage Tool Strengths**: CV excels at detection (fast, cheap), LLMs excel at classification (nuanced, context-aware). Combining them optimizes cost and accuracy.

- **Granularity Tradeoffs Are Central**: Level 3 strike detail provides valuable insights without overwhelming model complexity or training data requirements.

- **Client-Side Constraints Reduce Complexity**: Limiting video length to 1-6 minutes prevents edge cases and keeps costs predictable during testing.

- **Testing Scale Enables Manual Validation**: 5-20 videos/day allows for quality review of every result, crucial for refining prompts and validating accuracy.

- **Future Migration Path Needs Design Now**: Model-agnostic architecture from day 1 enables cloud-to-self-hosted transition without rewriting the application.

- **Processing Time Flexibility Is Valuable**: 5-10 minute acceptable window enables intelligent batching and cost optimization impossible in real-time systems.

---

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Hybrid CV + LLM Architecture Implementation

**Rationale:**

- Core technical foundation for the entire application
- Balances cost constraints with accuracy requirements
- Uses proven tools (MediaPipe + cloud LLM APIs)
- No training data required for MVP
- Aligns with user's technical skillset

**Next steps:**

1. Set up MediaPipe Pose for fighter detection and pose estimation
2. Implement motion detection to identify candidate strike moments
3. Integrate cloud LLM API (test GPT-4V, Claude 3.5 Sonnet, Gemini)
4. Develop prompt engineering strategy for strike classification
5. Build data pipeline: video → frames → CV detection → LLM classification → structured data
6. Measure accuracy and cost per video with real sparring footage

**Resources needed:**

- MediaPipe/OpenCV libraries
- Cloud API keys and credits ($100-200 for testing)
- Sample sparring videos (3-5 videos across different sports)
- JSON schema for strike event data structure

**Timeline:** 2-4 weeks for functional prototype

---

#### #2 Priority: Strike Event Data Structure & Storage

**Rationale:**

- Must be defined before building processing pipeline
- Level 3 granularity balances detail with feasibility
- Supports future features (combinations, metrics, reports)
- Database schema needs design upfront

**Next steps:**

1. Finalize strike event JSON schema (implement designed structure)
2. Design database schema (PostgreSQL or MongoDB)
3. Define relationships: Session → Fighters → Strike Events → Combinations
4. Build data validation layer
5. Create test dataset with sample strike events
6. Design API endpoints for data retrieval

**Resources needed:**

- Database (PostgreSQL recommended for structured data)
- ORM/data layer (SQLAlchemy, Prisma, or equivalent)
- Sample annotated video with ground truth data

**Timeline:** 1-2 weeks

---

#### #3 Priority: Model-Agnostic LLM Abstraction Layer

**Rationale:**

- Critical for future cloud-to-self-hosted migration
- Enables A/B testing different LLM providers
- Allows cost optimization by switching models
- Small investment now prevents major refactor later

**Next steps:**

1. Design LLM service interface (abstract methods: analyze_frame, classify_strike, generate_report)
2. Implement adapters for GPT-4V, Claude, Gemini APIs
3. Build configuration system for model selection
4. Add cost tracking per provider
5. Create prompt templates that work across models
6. Implement fallback logic if primary model unavailable

**Resources needed:**

- API keys for multiple providers
- Configuration management system
- Prompt template library

**Timeline:** 1 week

---

## Reflection & Follow-up

### What Worked Well

- Strategic questioning approach uncovered specific technical constraints and priorities
- Iterative data structure design clarified feasibility and scope
- Cost-first thinking drove pragmatic architectural decisions
- Breaking down granularity levels made complex taxonomy manageable
- User's existing cloud/fullstack experience enables ambitious architecture

### Areas for Further Exploration

- **Prompt Engineering Strategy**: How to structure prompts for consistent strike classification across different models
- **Frame Sampling Algorithm**: Which frames to send to LLM (every N frames? motion threshold? pose-based triggers?)
- **Combination Detection Logic**: Time windows, strike clustering, pattern matching approaches
- **Model Accuracy Benchmarking**: How to validate LLM classification accuracy against ground truth
- **Report Generation**: What insights and visualizations to include in the final analysis output
- **User Experience Flow**: Upload → processing feedback → results presentation

### Recommended Follow-up Techniques

- **SCAMPER Method**: For report generation features (Substitute/Combine/Adapt/Modify/Put to use/Eliminate/Reverse)
- **Morphological Analysis**: For frame sampling strategies (parameters: sampling rate, motion threshold, pose triggers)
- **Use Case Scenarios**: Walk through specific user journeys (coach analyzing fighter, athlete self-review, etc.)
- **Technical Prototyping Session**: Build spike to validate CV → LLM pipeline with real video

### Questions That Emerged

- Which specific LLM API should be the primary choice for V1? (Cost vs accuracy testing needed)
- What's the optimal frame sampling rate to balance cost and accuracy?
- How do we handle edge cases: overlapping strikes, simultaneous strikes from both fighters, strikes outside frame?
- What's the ground truth dataset for validating accuracy during development?
- Should stance detection happen at video start or tracked continuously?
- How do we handle video quality variations (phone camera, gym lighting, distance from fighters)?
- What's the minimum viable report format for V1?
- Authentication and user management architecture?

### Next Session Planning

**Suggested topics:**

1. **Prompt Engineering Workshop**: Design and test specific prompts for strike classification
2. **Technical Architecture Deep Dive**: Complete system diagram, tech stack decisions, deployment strategy
3. **MVP Feature Scope**: Define what gets built in V1 vs deferred (report features, UI, user accounts)
4. **Testing & Validation Strategy**: How to ensure accuracy, collect feedback, iterate

**Recommended timeframe:** Within 1-2 weeks, after initial prototype spike

**Preparation needed:**

- Test one LLM API with sample sparring video
- Document prompt attempts and results
- Identify techsznical unknowns/blockers from initial experimentation

---

_Session facilitated using the BMAD-METHOD™ brainstorming framework_
