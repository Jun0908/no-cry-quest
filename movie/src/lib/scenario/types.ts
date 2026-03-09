export interface SceneDefinition {
    id: string;
    text: string;
    narration: string;
    imagePrompt: string;
}

export interface ScenarioDefinition {
    title: string;
    scenes: SceneDefinition[];
}

export interface ScenarioProvider {
    generateScenario(prompt: string): Promise<ScenarioDefinition>;
}
