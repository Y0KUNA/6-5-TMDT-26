{
  description = "Node.js LTS dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";                    # Adjust this to your system architecture if needed
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs
          pkgs.pnpm
        ];

        shellHook = ''
          echo "Node LTS: $(node -v)"
        '';
      };
    };
}