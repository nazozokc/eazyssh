{
  description = "eazyssh - simple SSH host manager";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages = {
          eazyssh = pkgs.buildNpmPackage {
            pname = "eazyssh";
            version = "0.1.0";
            src = ./simple-ssh;
            npmDepsHash = "sha256-ZTvP2387UofgDSNF+AGIksbVfueweayN/zKADFzu6a0=";
            npmBuildScript = "build";
            postInstall = ''
              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs}/bin/node $out/bin/eazyssh \
                --add-flags "$out/lib/node_modules/eazyssh/dist/index.js"
            '';
            nativeBuildInputs = [ pkgs.makeWrapper ];
          };

          default = self.packages.${system}.eazyssh;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            fzf
            openssh
          ];
        };
      }
    );
}
