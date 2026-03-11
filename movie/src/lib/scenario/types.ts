export interface SceneDefinition {
    id: string;
    textOverlay?: {
        text: string;
        animation?: string;
    };
    imagePrompt: string;
}

export interface ScenarioDefinition {
    title: string;
    scenes: SceneDefinition[];
}

export interface ScenarioProvider {
    generateScenario(prompt: string): Promise<ScenarioDefinition>;
}
