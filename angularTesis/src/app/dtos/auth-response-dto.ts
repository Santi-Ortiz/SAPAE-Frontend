export class AuthResponseDTO {
    constructor(
        public accessToken: string,
        public tokenType: string = 'Bearer '
    ) { }
}
