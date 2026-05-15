import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    dark: boolean;
    colors: {
      blue: string;
      body: string;
      container: string;
      border: string;
      success: string;
      error: string;
    };
    text: {
      color: string;
      title: string;
    };
  }
}
