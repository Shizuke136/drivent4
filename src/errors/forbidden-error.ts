import { ApplicationError } from "@/protocols";

export function forbiddenError(): ApplicationError {
  return{
    name: "ForbiddenError",
    message: "The client is authenticated but doesn't have permission to access the resource"
  };
}
  
